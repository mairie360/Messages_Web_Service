import { NextRequest, NextResponse } from "next/server";

const DEFAULT_USER_BFF_URL = "http://localhost:4000";

function getUserBffUrl(path: string) {
  const baseUrl = (
    process.env.USER_BFF_URL ??
    process.env.BFF_USER_API_URL ??
    DEFAULT_USER_BFF_URL
  ).replace(/\/+$/, "");

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function meResponse(
  body: unknown,
  status: number,
  startedAt: number,
  requestPath: string,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, { ...init, status });
  console.log(`GET ${requestPath} ${status} in ${Date.now() - startedAt}ms`);
  return response;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestPath = new URL(request.url).pathname;
  const token = request.cookies.get("accessToken")?.value;

  if (!token) {
    return meResponse({ message: "Session invalide." }, 401, startedAt, requestPath);
  }

  try {
    const upstreamResponse = await fetch(getUserBffUrl("/me"), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (upstreamResponse.status === 401) {
      return meResponse({ message: "Session expirée." }, 401, startedAt, requestPath);
    }

    if (!upstreamResponse.ok) {
      return meResponse(
        { message: "Le contexte utilisateur est indisponible." },
        upstreamResponse.status,
        startedAt,
        requestPath,
      );
    }

    return meResponse(await readJson(upstreamResponse), 200, startedAt, requestPath, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return meResponse(
      { message: "Le service utilisateur est indisponible." },
      502,
      startedAt,
      requestPath,
    );
  }
}
