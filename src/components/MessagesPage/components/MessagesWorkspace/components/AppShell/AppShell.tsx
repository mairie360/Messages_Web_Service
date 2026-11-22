'use client';

import { AccessibleShell as SharedAppShell } from "@mairie360/lib-components/shell";

import { Button, ErrorAlert, RetryButton } from "@mairie360/lib-components/primitives";
import { useState, type ReactNode } from "react";
import { navigateToLogin } from '@/lib/logout';
import { logoutAndReload, useAuthSession, type AuthSession } from '@/lib/auth-session';
import { getActiveFrontHrefs } from '@/lib/navigation';
import { frontUrl } from '@/lib/front-urls';
import { legalLinksFor } from '@/lib/shell-info';
import { useShellInfo } from '@/lib/shell-info-provider';
import { navigationItems } from './navigation-items';

type AppShellProps = {
  activeItem: string;
  /** Unread messages shown as the badge of « Messagerie » in the navigation. */
  unreadCount?: number;
  children: ReactNode | ((session: AuthSession) => ReactNode);
};

/**
 * Bind the BFF-backed session and bounded messaging viewport to the shared shell: lib logo,
 * commune name, footer with version and legal links (MAIR-844).
 */
export function AppShell({ activeItem, unreadCount = 0, children }: AppShellProps) {
  const session = useAuthSession();
  const { communeName, version } = useShellInfo();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  async function logout() {
    setLogoutError(null);
    try { await logoutAndReload(); } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "La déconnexion n’a pas abouti. Veuillez réessayer.");
    }
  }
  const frontHrefs = getActiveFrontHrefs();

  return (
    <SharedAppShell
      activeItem={activeItem}
      user={session.user}
      onLogout={() => void logout()}
      hrefs={{ ...frontHrefs, messages: frontHrefs.messages ?? "/" }}
      mainLayout="fill"
      sidebarProps={{ brandLabel: communeName, items: navigationItems(unreadCount) }}
      footerProps={{ version, legalLinks: legalLinksFor(frontUrl("LOGIN_FRONT_URL")) }}
    >
      <div className="messages-main-inner">
        {logoutError && <div className="mb-4 shrink-0">
          <ErrorAlert title={logoutError} onDismiss={() => setLogoutError(null)} />
          <div className="mt-3 flex flex-wrap gap-3">
            <RetryButton variant="outline" tone="neutral" onClick={() => void logout()} />
            <Button variant="outline" tone="neutral" label="Retour à la connexion" onClick={() => navigateToLogin(true)} />
          </div>
        </div>}
        {typeof children === "function" ? children(session) : children}
      </div>
    </SharedAppShell>
  );
}
