import React from 'react';

import { messagingIdsMatch } from './messaging-model';
import type { MessagingContactId, MessagingConversation, MessagingMessage, MessagingSendResult } from './messaging-types';
import { lastVisibleMessagingMessageId } from './visible-message';

const readFailureMessage = 'Les messages affichés n’ont pas pu être marqués comme lus. Réessayez.';

export interface VisibleMessagesReadFailure {
  conversationId: MessagingContactId;
  message: string;
}

/**
 * "Mark as read" up to the last message actually visible in the thread region.
 * One request at a time; a result that arrives after the thread changed is dropped.
 */
export function useVisibleMessagesRead(
  activeConversationId: MessagingContactId | undefined,
  visibleMessages: MessagingMessage[],
  onReadVisibleMessages?: (conversation: MessagingConversation, lastVisibleMessage: MessagingMessage | null) => MessagingSendResult,
) {
  const activeIdRef = React.useRef(activeConversationId);
  React.useLayoutEffect(() => { activeIdRef.current = activeConversationId; }, [activeConversationId]);
  const messageRegionRef = React.useRef<HTMLDivElement>(null);
  const readRequestRef = React.useRef<symbol | null>(null);
  const [readPending, setReadPending] = React.useState(false);
  const [readFailure, setReadFailure] = React.useState<VisibleMessagesReadFailure | null>(null);
  React.useEffect(() => () => { readRequestRef.current = null; }, []);

  const readVisibleMessages = async (conversation: MessagingConversation) => {
    if (!onReadVisibleMessages || readRequestRef.current ||
        !messagingIdsMatch(activeIdRef.current, conversation.id)) return;
    const request = Symbol('visible-message-read');
    readRequestRef.current = request;
    setReadPending(true);
    setReadFailure(null);
    const stillCurrent = () => readRequestRef.current === request && messagingIdsMatch(activeIdRef.current, conversation.id);
    try {
      // Let the action menu close before inspecting the actual clipped message region.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (!stillCurrent()) return;
      const id = lastVisibleMessagingMessageId(messageRegionRef.current);
      const lastMessage = id === null ? null : visibleMessages.find(message => String(message.id) === id) ?? null;
      const accepted = await onReadVisibleMessages(conversation, lastMessage);
      if (accepted === false && stillCurrent()) setReadFailure({ conversationId: conversation.id, message: readFailureMessage });
    } catch {
      if (stillCurrent()) setReadFailure({ conversationId: conversation.id, message: readFailureMessage });
    } finally {
      if (readRequestRef.current === request) {
        readRequestRef.current = null;
        setReadPending(false);
      }
    }
  };

  return { messageRegionRef, readPending, readFailure, readVisibleMessages };
}
