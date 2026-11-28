import React from 'react';
import { Counter, Text } from '@mairie360/lib-components/primitives';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { conversationSubtitle } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model';
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
 * One line of the list, three columns as in the artifact: the avatar with its presence dot; the full name, the
 * service (or « Groupe · N membres ») and the last message, each on one line; then the time above the unread
 * lib `Counter`, so the name takes the whole middle column.
 */
export const MessagingConversationItem = ({
  conversation,
  active = false,
  className = '',
  ...props
}: MessagingConversationItemProps) => {
  const unread = Number.isSafeInteger(conversation.unreadCount) && (conversation.unreadCount ?? 0) > 0 ? conversation.unreadCount! : 0;
  const subtitle = conversationSubtitle(conversation);
  return (
    <button
      type="button"
      data-unread={unread > 0 || undefined}
      aria-current={active || undefined}
      className={joinClasses(
        'relative grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-[var(--mairie-radius-m)] p-2.5 text-left text-[var(--mairie-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30',
        active
          ? 'bg-[var(--mairie-navigation-active-background)] before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-r-[3px] before:bg-[var(--mairie-navigation-active-indicator)]'
          : 'bg-transparent hover:bg-[var(--mairie-navigation-hover-background)]',
        className
      )}
      {...props}
    >
      <MessagingContactAvatar
        name={conversation.name}
        src={conversation.avatarUrl}
        initials={conversation.initials}
        presence={conversation.presence}
        group={conversation.kind === 'group'}
        size="sm"
      />
      <span className="flex min-w-0 flex-col gap-px">
        <Text as="span" size="s" weight="semibold" truncate data-conversation-name="">{conversation.name}</Text>
        {subtitle && <Text as="span" size="xs" tone="muted" truncate data-conversation-subtitle="">{subtitle}</Text>}
        <Text
          as="span"
          size="s"
          tone={unread ? undefined : 'muted'}
          weight={unread ? 'medium' : undefined}
          truncate
          className="mt-0.5"
          data-conversation-preview=""
        >
          {conversation.lastMessage ?? ''}
        </Text>
      </span>
      <span className="flex flex-col items-end gap-1.5 whitespace-nowrap">
        <Text as="span" size="xs" tone="muted" data-conversation-time="">{conversation.lastMessageAt ?? ''}</Text>
        {unread > 0 && (
          <>
            <Counter value={unread} />
            <span className="sr-only">{unreadLabel(unread)}</span>
          </>
        )}
      </span>
    </button>
  );
};
