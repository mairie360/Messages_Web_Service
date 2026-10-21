import { Bell } from 'lucide-react';

import type { MessagingConversation } from '../types';

export interface UnreadNotificationsBarProps {
  count: number;
  firstUnreadConversation?: MessagingConversation;
  onOpen: (conversation: MessagingConversation) => void;
}

/** Total of unread messages, with a shortcut to the first thread holding some. */
export const UnreadNotificationsBar = ({ count, firstUnreadConversation, onOpen }: UnreadNotificationsBarProps) => (
  <div
    role="status"
    aria-label="Notifications de messagerie"
    className="flex flex-wrap items-center gap-3 border-b border-[var(--mairie-border)] bg-[var(--mairie-warning-surface)] px-4 py-2.5 text-sm text-[var(--mairie-warning-text)] sm:px-5"
  >
    <Bell className="size-4 shrink-0" strokeWidth={1.8} />
    <span className="font-semibold">
      {count} notification{count > 1 ? 's' : ''} non lue
      {count > 1 ? 's' : ''}
    </span>
    {firstUnreadConversation && (
      <button
        type="button"
        className="rounded-md px-2 py-1 font-semibold text-[var(--mairie-accent)] transition hover:bg-[var(--mairie-surface)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
        onClick={() => onOpen(firstUnreadConversation)}
      >
        Voir {firstUnreadConversation.name}
      </button>
    )}
  </div>
);
