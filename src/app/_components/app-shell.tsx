'use client';

import { AppShell as SharedAppShell } from "@mairie360/lib-components";
import type { ReactNode } from "react";
import { logoutAndReload, useAuthSession, type AuthSession } from "@/lib/auth-session";
import { getActiveFrontHrefs } from "@/lib/navigation";

type AppShellProps = {
  activeItem: string;
  children: ReactNode | ((session: AuthSession) => ReactNode);
};

/** Bind the BFF-backed session and bounded messaging viewport to the shared shell. */
export function AppShell({ activeItem, children }: AppShellProps) {
  const session = useAuthSession();
  const frontHrefs = getActiveFrontHrefs();

  return (
    <SharedAppShell
      activeItem={activeItem}
      isAdmin={session.isAdmin}
      user={session.user}
      onLogout={() => void logoutAndReload()}
      hrefs={{ ...frontHrefs, messages: frontHrefs.messages ?? "/" }}
      sidebarProps={{ brandLogoSrc: "/mairie360-logo.png" }}
      className="messages-app-root"
    >
      <div className="messages-main-inner">
        {typeof children === "function" ? children(session) : children}
      </div>
    </SharedAppShell>
  );
}
