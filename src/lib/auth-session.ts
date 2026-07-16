"use client";

import { useEffect, useState } from "react";

type HeaderUser = {
  name: string;
  email?: string;
  role?: string;
  service?: string;
};

type SessionUser = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
};

type SessionGroup = {
  name?: unknown;
};

type SessionResponse = {
  user?: SessionUser | null;
  groups?: SessionGroup[] | null;
};

function isAdministratorGroup(groupName: string) {
  return groupName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .startsWith("admin");
}

function isAdministrator(user: HeaderUser) {
  return user.role?.trim().toLowerCase() === "admin";
}

export function useAuthSession<T extends HeaderUser>(fallbackUser: T) {
  const [session, setSession] = useState({
    user: fallbackUser,
    groups: [] as string[],
    isAdmin: isAdministrator(fallbackUser),
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          await logoutAndReload();
          return;
        }

        if (!response.ok) return;

        const body = (await response.json()) as SessionResponse;
        const groups = Array.isArray(body.groups)
          ? body.groups
              .map((group) =>
                typeof group.name === "string" ? group.name.trim() : "",
              )
              .filter(Boolean)
          : null;
        const firstName =
          typeof body.user?.first_name === "string"
            ? body.user.first_name.trim()
            : "";
        const lastName =
          typeof body.user?.last_name === "string"
            ? body.user.last_name.trim()
            : "";
        const name = `${firstName} ${lastName}`.trim();
        const email =
          typeof body.user?.email === "string" ? body.user.email.trim() : "";
        const groupLabel = groups?.length ? groups.join(", ") : "Aucun groupe";

        setSession({
          user: {
            ...fallbackUser,
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
            ...(groups ? { role: groupLabel, service: groupLabel } : {}),
          },
          groups: groups ?? [],
          isAdmin: groups
            ? groups.some(isAdministratorGroup)
            : isAdministrator(fallbackUser),
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Les informations de repli restent affichées si le BFF est indisponible.
        }
      }
    }

    void loadSession();

    return () => controller.abort();
  }, [fallbackUser]);

  return session;
}

export async function logoutAndReload() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });
  } finally {
    try {
      window.localStorage.clear();
    } finally {
      window.location.reload();
    }
  }
}
