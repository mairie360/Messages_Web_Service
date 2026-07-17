import { NextRequest } from "next/server";

type BusinessReferenceKind = "project" | "task" | "event";

type BusinessReference = {
  id: string;
  title: string;
  kind: BusinessReferenceKind;
  description?: string;
};

type ProjectListItem = {
  id: string;
  title: string;
};

type ProjectsPageResponse = {
  projects?: ProjectListItem[];
};

type ProjectTask = {
  id: string;
  title: string;
};

type ProjectDetailsResponse = {
  taskItems?: ProjectTask[];
};

type CalendarEvent = {
  id?: string | number;
  title: string;
  date?: string;
};

type CalendarBootstrapResponse = {
  events?: CalendarEvent[];
};

const DEFAULT_PROJECT_BFF_URL = "http://localhost:4001";
const DEFAULT_CALENDAR_BFF_URL = "http://localhost:4002";

function normalizedBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getAuthorizationHeader(request: NextRequest) {
  const requestAuthorization = request.headers.get("authorization");
  if (requestAuthorization) return requestAuthorization;

  const token = request.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : undefined;
}

async function fetchJson<T>(url: string, authorization?: string): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });

  if (authorization) headers.set("Authorization", authorization);

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function loadProjectReferences(authorization?: string): Promise<BusinessReference[]> {
  const projectBaseUrl = normalizedBaseUrl(
    process.env.PROJECT_BFF_URL ?? DEFAULT_PROJECT_BFF_URL,
  );
  const projectsPage = await fetchJson<ProjectsPageResponse>(
    `${projectBaseUrl}/projects-page?limit=100`,
    authorization,
  );
  const projects = projectsPage.projects ?? [];
  const taskRequests = await Promise.allSettled(
    projects.map((project) =>
      fetchJson<ProjectDetailsResponse>(
        `${projectBaseUrl}/projects/${encodeURIComponent(project.id)}`,
        authorization,
      ),
    ),
  );
  const taskReferences = taskRequests.flatMap((result, projectIndex) => {
    if (result.status !== "fulfilled") return [];

    const project = projects[projectIndex];
    return (result.value.taskItems ?? []).map((task) => ({
      id: `task:${task.id}`,
      title: task.title,
      kind: "task" as const,
      description: project ? `Tâche · ${project.title}` : "Tâche",
    }));
  });

  return [
    ...projects.map((project) => ({
      id: `project:${project.id}`,
      title: project.title,
      kind: "project" as const,
      description: "Projet",
    })),
    ...taskReferences,
  ];
}

function calendarDateRange() {
  const today = new Date();
  const from = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
  const to = new Date(Date.UTC(today.getUTCFullYear() + 1, 11, 31));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function loadCalendarReferences(authorization?: string): Promise<BusinessReference[]> {
  const calendarBaseUrl = normalizedBaseUrl(
    process.env.CALENDAR_BFF_URL ?? DEFAULT_CALENDAR_BFF_URL,
  );
  const { from, to } = calendarDateRange();
  const calendar = await fetchJson<CalendarBootstrapResponse>(
    `${calendarBaseUrl}/calendar/bootstrap?from=${from}&to=${to}`,
    authorization,
  );

  return (calendar.events ?? []).flatMap((event) => {
    if (event.id === undefined) return [];

    return [{
      id: `event:${String(event.id)}`,
      title: event.title,
      kind: "event" as const,
      description: event.date ? `Calendrier · ${event.date}` : "Calendrier",
    }];
  });
}

export async function GET(request: NextRequest) {
  const authorization = getAuthorizationHeader(request);
  const results = await Promise.allSettled([
    loadProjectReferences(authorization),
    loadCalendarReferences(authorization),
  ]);
  const references = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return Response.json(
    {
      references,
      sources: {
        projects: results[0]?.status === "fulfilled" ? "available" : "unavailable",
        calendar: results[1]?.status === "fulfilled" ? "available" : "unavailable",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
