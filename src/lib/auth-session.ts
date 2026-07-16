"use client";

import { useEffect, useState } from "react";

export const APP_ROLES = [
  "Admin",
  "Responsable",
  "Maire",
  "User",
  "Guest",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

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
  role?: unknown;
};

type SessionGroup = {
  name?: unknown;
};

type SessionRole = {
  name?: unknown;
};

type SessionResponse = {
  user?: SessionUser | null;
  groups?: SessionGroup[] | null;
  roles?: Array<SessionRole | string> | null;
};

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "Admin",
  administrateur: "Admin",
  administrator: "Admin",
  responsable: "Responsable",
  manager: "Responsable",
  maire: "Maire",
  mayor: "Maire",
  user: "User",
  utilisateur: "User",
  guest: "Guest",
  invite: "Guest",
};

function normalizeRoleKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/^role/, "");
}

export function normalizeAppRole(value: unknown): AppRole | null {
  return typeof value === "string"
    ? ROLE_ALIASES[normalizeRoleKey(value)] ?? null
    : null;
}

function getRoleName(role: SessionRole | string) {
  return typeof role === "string" ? role : role.name;
}

export function resolveAppRoles(roles: Array<SessionRole | string>): AppRole[] {
  const normalizedRoles = new Set(
    roles
      .map((role) => normalizeAppRole(getRoleName(role)))
      .filter((role): role is AppRole => role !== null),
  );

  const resolvedRoles = APP_ROLES.filter((role) => normalizedRoles.has(role));

  return resolvedRoles.length ? resolvedRoles : ["Guest"];
}

export function useAuthSession<T extends HeaderUser>(fallbackUser: T) {
  const [session, setSession] = useState({
    user: { ...fallbackUser, role: "Guest" as AppRole },
    groups: [] as string[],
    roles: ["Guest"] as AppRole[],
    role: "Guest" as AppRole,
    isAdmin: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/user/me", {
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
        const userRole =
          typeof body.user?.role === "string" && body.user.role.trim()
            ? [body.user.role]
            : [];
        const responseRoles = Array.isArray(body.roles) ? body.roles : [];
        const roles = resolveAppRoles(
          userRole.length > 0 ? userRole : responseRoles,
        );
        const role = roles[0];
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
            ...(groups ? { service: groupLabel } : {}),
            role,
          },
          groups: groups ?? [],
          roles,
          role,
          isAdmin: role === "Admin",
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
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
