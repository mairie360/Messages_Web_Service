'use client';

import { AccessibleShell as SharedAppShell } from "@mairie360/lib-components/shell";
import { NotificationCenter, type NotificationSource } from "@mairie360/lib-components/shell";

import { Button, ErrorAlert, RetryButton } from "@mairie360/lib-components/primitives";
import { useState, type MouseEvent, type ReactNode } from "react";
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
  /** Mention alerts of the header bell; without them the bell keeps the lib's default panel. */
  notifications?: ShellNotifications;
  /** Opens a conversation of the page; a bell link to it is followed without reloading the page. */
  onOpenConversation?: (conversationId: string) => void;
};

/** The header bell of the page: unread count, the lib port, and the conversation a bell link opens. */
export type ShellNotifications = {
  count: number;
  source: NotificationSource;
  conversationOf: (href: string) => string | null;
};

/**
 * Bind the BFF-backed session and bounded messaging viewport to the shared shell: lib logo,
 * commune name (MAIR-844). MAIR-1156: the page base of lib 2.3 has no footer (`showFooter={false}`);
 * version and legal links stay passed for a page that would show it.
 */
export function AppShell({ activeItem, unreadCount = 0, children, notifications, onOpenConversation }: AppShellProps) {
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
  // The page renders the lib NotificationCenter itself: the shell's own panel would keep the count it read at its last
  // opening, while a mention may arrive with the panel closed.
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  function followNotificationLink(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest?.('a[href]');
    const conversationId = link && notifications?.conversationOf(link.getAttribute('href') ?? '');
    if (!conversationId || !onOpenConversation || event.defaultPrevented || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setNotificationsOpen(false);
    onOpenConversation(conversationId);
  }

  return (
    <SharedAppShell
      activeItem={activeItem}
      user={session.user}
      onLogout={() => void logout()}
      hrefs={{ ...frontHrefs, messages: frontHrefs.messages ?? "/" }}
      mainLayout="fill"
      commune={communeName}
      sidebarProps={{ items: navigationItems(unreadCount) }}
      footerProps={{ version, legalLinks: legalLinksFor(frontUrl("LOGIN_FRONT_URL")) }}
      showFooter={false}
      headerProps={notifications
        ? { notificationCount: notifications.count, onNotificationsClick: () => setNotificationsOpen(true) }
        : undefined}
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
      {notifications && notificationsOpen && <div className="contents" onClickCapture={followNotificationLink}>
        <NotificationCenter source={notifications.source} onClose={() => setNotificationsOpen(false)} />
      </div>}
    </SharedAppShell>
  );
}
