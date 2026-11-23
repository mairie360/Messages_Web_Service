import React from 'react';
import { Counter, Text } from '@mairie360/lib-components/primitives';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { MessagingContactAvatar } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessagingContactAvatar';
import type { MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessagingConversationItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  conversation: MessagingConversation;
  active?: boolean;
}

/** Spoken count of the unread messages; the lib `Counter` itself is decorative inside the button. */
export const unreadLabel = (count: number) => (count === 1 ? '1 message non lu' : `${count} messages non lus`);

/**
 * One line of the list (MAIR-1157, Figma F9): avatar (initials of a person or of a group) with its presence dot,
 * name and preview each truncated on one line, time right-aligned in a fixed column, unread lib `Counter`.
 */
export const MessagingConversationItem = ({
  conversation,
  active = false,
  className = '',
  ...props
}: MessagingConversationItemProps) => {
  const unread = Number.isSafeInteger(conversation.unreadCount) && (conversation.unreadCount ?? 0) > 0 ? conversation.unreadCount! : 0;
  return (
    <button
      type="button"
      data-unread={unread > 0 || undefined}
      className={joinClasses(
        'flex w-full min-w-0 items-center gap-3 rounded-[var(--mairie-radius-m)] border p-3 text-left text-[var(--mairie-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30',
        active
          ? 'border-[var(--mairie-accent)] bg-[var(--mairie-accent-surface)]'
          : 'border-transparent bg-[var(--mairie-surface)] hover:bg-[var(--mairie-surface-raised)]',
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
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <Text as="span" size="m" weight={unread ? 'bold' : 'semibold'} truncate className="min-w-0 flex-1">{conversation.name}</Text>
          <Text as="span" size="xs" tone="muted" truncate className="w-[4.75rem] shrink-0 text-right">{conversation.lastMessageAt ?? ''}</Text>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <Text as="span" size="s" tone="muted" truncate className="min-w-0 flex-1">{conversation.lastMessage ?? ''}</Text>
          {unread > 0 && (
            <>
              <Counter value={unread} />
              <span className="sr-only">{unreadLabel(unread)}</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
};
