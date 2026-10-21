import React from 'react';

import { MessagingComposer } from '../MessagingComposer';
import type {
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMention,
  MessagingSendResult,
} from '../types';

export interface ConversationComposersProps {
  conversations: MessagingConversation[];
  activeConversation: MessagingConversation | null;
  mentionOptions: MessagingMention[];
  businessReferenceOptions: MessagingBusinessReference[];
  onSendMessage?: (
    conversationId: MessagingContactId,
    content: string,
    attachments?: MessagingAttachment[],
    mentions?: MessagingMention[],
    businessLinks?: MessagingBusinessReference[]
  ) => MessagingSendResult;
  onAttach?: (files: File[], attachments: MessagingAttachment[]) => void;
  onEmoji?: (emoji: string) => void;
}

// Keep only visited drafts mounted: switching threads must neither move a draft
// to a different recipient nor discard its pending send, files or references.
// The account key on this component clears the entire in-memory draft session.
export const ConversationComposers = ({
  conversations, activeConversation, mentionOptions, businessReferenceOptions,
  onSendMessage, onAttach, onEmoji,
}: ConversationComposersProps) => {
  const [visitedIds, setVisitedIds] = React.useState<string[]>([]);
  const availableIds = new Set(conversations.map(conversation => String(conversation.id)));
  const activeId = activeConversation ? String(activeConversation.id) : undefined;
  const draftIds = visitedIds.filter(id => availableIds.has(id));
  if (activeId !== undefined && !draftIds.includes(activeId)) draftIds.push(activeId);

  // Adjust this component's own state before its children render, so a removed
  // thread releases its draft immediately (no effect-driven flash or remount).
  if (draftIds.length !== visitedIds.length || draftIds.some((id, index) => id !== visitedIds[index])) {
    setVisitedIds(draftIds);
  }

  return (
    <>
      {draftIds.map(id => {
        const conversation = conversations.find(item => String(item.id) === id)!;
        return (
          <div key={id} hidden={id !== activeId}>
            <MessagingComposer
              disabled={id !== activeId || !onSendMessage}
              mentionOptions={mentionOptions}
              businessReferenceOptions={businessReferenceOptions}
              onSendMessage={onSendMessage ? (content, attachments, mentions, businessLinks) =>
                onSendMessage(conversation.id, content, attachments, mentions, businessLinks) : undefined}
              onAttach={onAttach}
              onEmoji={onEmoji}
            />
          </div>
        );
      })}
      {!activeConversation && <MessagingComposer key="inactive" disabled />}
    </>
  );
};
