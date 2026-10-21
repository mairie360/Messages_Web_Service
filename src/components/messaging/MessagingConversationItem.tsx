import React from 'react';

import { joinClasses } from './style';
import { MessagingContactAvatar } from './MessagingContactAvatar';
import type { MessagingConversation } from './types';

export interface MessagingConversationItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  conversation: MessagingConversation;
  active?: boolean;
}

export const MessagingConversationItem = ({
  conversation,
  active = false,
  className = '',
  ...props
}: MessagingConversationItemProps) => (
  <button
    type="button"
    className={joinClasses(
      'flex min-h-[102px] w-full items-start gap-3 rounded-lg border bg-[var(--mairie-surface)] p-3 text-left text-[var(--mairie-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30',
      active
        ? 'border-[var(--mairie-accent)] bg-[var(--mairie-accent-surface)] shadow-[var(--mairie-shadow)]'
        : 'border-[var(--mairie-border)] hover:border-[var(--mairie-border)] hover:bg-[var(--mairie-surface-raised)]',
      className
    )}
    {...props}
  >
    <MessagingContactAvatar
      name={conversation.name}
      src={conversation.avatarUrl}
      initials={conversation.initials}
      presence={conversation.presence}
      size="md"
      className="mt-1"
    />
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="min-w-0 w-full">
          <span className="block break-words text-base font-semibold leading-6">{conversation.name}</span>
          {conversation.department && (
            <span className="block truncate text-xs leading-5 text-[var(--mairie-muted)]">{conversation.department}</span>
          )}
        </span>
        {conversation.lastMessageAt && (
          <span className="shrink-0 text-xs leading-5 text-[var(--mairie-muted)]">{conversation.lastMessageAt}</span>
        )}
      </span>
      <span className="mt-0.5 flex items-center gap-2">
        {conversation.lastMessage && (
          <span className="min-w-0 flex-1 truncate text-sm leading-5 text-[var(--mairie-muted)]">{conversation.lastMessage}</span>
        )}
        {!!conversation.unreadCount && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--mairie-action-background)] text-xs font-semibold leading-none text-[var(--mairie-on-action)]">
            {conversation.unreadCount}
          </span>
        )}
      </span>
    </span>
  </button>
);
