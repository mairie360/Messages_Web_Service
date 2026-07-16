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

export type AuthSessionUser = {
  name: string;
  email?: string;
  role?: string;
  service?: string;
  phone?: string;
  status?: string;
  avatar?: string;
  avatarUrl?: string;
  position?: string;
  address?: string;
  city?: string;
  lastConnection?: string;
};

type SessionUser = {
  name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  phone_number?: unknown;
  status?: unknown;
  role?: unknown;
  roles?: Array<SessionRole | string> | null;
  groups?: Array<SessionGroup | string> | null;
};

type SessionGroup = {
  name?: unknown;
};

type SessionRole = {
  name?: unknown;
};

type SessionResponse = {
  user?: SessionUser | null;
  groups?: Array<SessionGroup | string> | null;
  roles?: Array<SessionRole | string> | null;
};

export type AuthSession = {
  user: AuthSessionUser & { role: AppRole };
  groups: string[];
  roles: AppRole[];
  role: AppRole;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
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

function getGroupName(group: SessionGroup | string) {
  return typeof group === "string" ? group : group.name;
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

export function useAuthSession(fallbackUser: AuthSessionUser) {
  const [session, setSession] = useState<AuthSession>({
    user: {
      ...fallbackUser,
      name: "Chargement…",
      email: undefined,
      phone: undefined,
      service: undefined,
      status: undefined,
      position: undefined,
      address: undefined,
      city: undefined,
      lastConnection: undefined,
      role: "Guest",
    },
    groups: [],
    roles: ["Guest"],
    role: "Guest",
    isAdmin: false,
    loading: true,
    error: null,
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

        if (!response.ok) {
          setSession((current) => ({
            ...current,
            loading: false,
            error: "Les informations du profil sont indisponibles.",
          }));
          return;
        }

        const body = (await response.json()) as SessionResponse;
        const rawGroups = Array.isArray(body.groups)
          ? body.groups
          : Array.isArray(body.user?.groups)
            ? body.user.groups
            : [];
        const groups = rawGroups
          .map((group) => {
            const groupName = getGroupName(group);
            return typeof groupName === "string" ? groupName.trim() : "";
          })
          .filter(Boolean);
        const userRole =
          typeof body.user?.role === "string" && body.user.role.trim()
            ? [body.user.role]
            : [];
        const responseRoles = Array.isArray(body.user?.roles)
          ? body.user.roles
          : Array.isArray(body.roles)
            ? body.roles
            : [];
        const roles = resolveAppRoles(
          userRole.length > 0 ? userRole : responseRoles,
        );
        const role = roles[0];
        const explicitName =
          typeof body.user?.name === "string" ? body.user.name.trim() : "";
        const firstName =
          typeof body.user?.first_name === "string"
            ? body.user.first_name.trim()
            : "";
        const lastName =
          typeof body.user?.last_name === "string"
            ? body.user.last_name.trim()
            : "";
        const name = explicitName || `${firstName} ${lastName}`.trim();
        const email =
          typeof body.user?.email === "string" ? body.user.email.trim() : "";
        const rawPhone = body.user?.phone ?? body.user?.phone_number;
        const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
        const status =
          typeof body.user?.status === "string" ? body.user.status.trim() : "";
        const groupLabel = groups?.length ? groups.join(", ") : "Aucun groupe";

        setSession({
          user: {
            ...fallbackUser,
            name: name || "Utilisateur",
            email: email || undefined,
            phone: phone || undefined,
            status: status || undefined,
            service: groupLabel,
            position: undefined,
            address: undefined,
            city: undefined,
            lastConnection: undefined,
            role,
          },
          groups,
          roles,
          role,
          isAdmin: role === "Admin",
          loading: false,
          error: null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSession((current) => ({
          ...current,
          loading: false,
          error: "Le service utilisateur est indisponible.",
        }));
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
