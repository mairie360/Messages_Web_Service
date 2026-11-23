import React from 'react';
import { Text } from '@mairie360/lib-components/primitives';

import { MessagingConversationItem } from './components/MessagingConversationItem';
import type { MessagingContactId, MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface ConversationListProps {
  conversations: MessagingConversation[];
  activeConversationId?: MessagingContactId;
  emptyLabel: React.ReactNode;
  onSelect?: (conversation: MessagingConversation) => void;
}

export const ConversationList = ({ conversations, activeConversationId, emptyLabel, onSelect }: ConversationListProps) => (
  <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
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
      // MAIR-870 (Figma F9): a muted lib Text, the search stays a local filter.
      <Text as="p" size="s" tone="muted" className="p-4 text-center" data-empty-state="conversations">{emptyLabel}</Text>
    )}
  </div>
);
