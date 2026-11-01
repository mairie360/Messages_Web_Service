import React from 'react';

import { MessagingConversationItem } from './components/MessagingConversationItem';
import type { MessagingContactId, MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface ConversationListProps {
  conversations: MessagingConversation[];
  activeConversationId?: MessagingContactId;
  emptyLabel: React.ReactNode;
  onSelect?: (conversation: MessagingConversation) => void;
}

export const ConversationList = ({ conversations, activeConversationId, emptyLabel, onSelect }: ConversationListProps) => (
  <div className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
    {conversations.length > 0 ? (
      conversations.map((conversation) => (
        <MessagingConversationItem
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === activeConversationId}
          onClick={() => onSelect?.(conversation)}
        />
      ))
    ) : (
      <div className="rounded-lg border border-dashed border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-4 text-center text-sm text-[var(--mairie-muted)]">
        {emptyLabel}
      </div>
    )}
  </div>
);
