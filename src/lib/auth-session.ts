"use client";

import { useEffect, useState } from "react";
import { BffRequestError, messageClient, type CurrentUserDto } from "../clients/messageClient";

export type AppRole = "Admin" | "Responsable" | "Maire" | "User" | "Guest";

export type AuthSessionUser = {
  name: string;
  email?: string;
  role: AppRole;
  service?: string;
  phone?: string;
  avatarUrl?: string;
  position?: string;
  address?: string;
  city?: string;
  lastConnection?: string;
};

export type AuthSession = {
  user: AuthSessionUser;
  role: AppRole;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

export type AuthSessionResult =
  | { status: "authenticated"; session: AuthSession }
  | { status: "unauthorized" }
  | { status: "error"; error: string };

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
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/^role/, "");
}

/** Rôle applicatif (alias FR/EN, préfixe `ROLE_`, accents) ; `Guest` si le rôle est absent ou inconnu. */
export function normalizeAppRole(value: string | undefined): AppRole {
  return value ? ROLE_ALIASES[normalizeRoleKey(value)] ?? "Guest" : "Guest";
}

/** Convertit l'utilisateur courant de BFF Message (`GET /me`) en session applicative. */
export function toAuthSession(currentUser: CurrentUserDto): AuthSession {
  const role = normalizeAppRole(currentUser.role);
  const text = (value: string | undefined) => value?.trim() || undefined;

  return {
    user: {
      name: text(currentUser.name) ?? text(currentUser.email) ?? "",
      email: text(currentUser.email),
      role,
      service: text(currentUser.service),
      phone: text(currentUser.phone),
      avatarUrl: text(currentUser.avatarUrl),
      position: text(currentUser.position),
      address: text(currentUser.address),
      city: text(currentUser.city),
      lastConnection: text(currentUser.lastConnection),
    },
    role,
    isAdmin: role === "Admin",
    loading: false,
    error: null,
  };
}

/** Charge la session courante auprès de BFF Message (`GET /me`, via le proxy same-origin). */
export async function fetchAuthSession(): Promise<AuthSessionResult> {
  try {
    const { currentUser } = await messageClient.getCurrentUser();
    return { status: "authenticated", session: toAuthSession(currentUser) };
  } catch (error) {
    if (error instanceof BffRequestError && error.status === 401) return { status: "unauthorized" };
    return { status: "error", error: "Les informations du profil sont indisponibles." };
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession>({
    user: { name: "Chargement…", role: "Guest" },
    role: "Guest",
    isAdmin: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const result = await fetchAuthSession();

      if (!active) return;

      if (result.status === "unauthorized") {
        await logoutAndReload();
        return;
      }

      if (result.status === "error") {
        setSession((current) => ({ ...current, loading: false, error: result.error }));
        return;
      }

      setSession(result.session);
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  return session;
}

/** Efface le cookie de session (route locale, sans BFF) puis recharge : le middleware redirige vers Login. */
export async function logoutAndReload() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });
  } finally {
    window.location.reload();
  }
}
