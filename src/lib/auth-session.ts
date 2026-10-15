"use client";
import { normalizeDisplayRole } from "@mairie360/front-kit/shared";

import { useEffect, useState } from "react";
import { navigateToLogin } from "./logout";
export { logoutAndReload } from "./logout";
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

/** One shared alias table; the BFF still owns business permissions. */
export function normalizeAppRole(value: string | undefined): AppRole {
  return normalizeDisplayRole(value) ?? "Guest";
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
        if (!navigateToLogin()) setSession((current) => ({ ...current, loading: false, error: "Les informations du profil sont indisponibles." }));
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
