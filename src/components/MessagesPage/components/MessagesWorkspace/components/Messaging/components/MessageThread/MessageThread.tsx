import React from 'react';
import { Text } from '@mairie360/lib-components/primitives';

import { MessagingMessageBubble } from './components/MessagingMessageBubble';
import { NewMessagesSeparator } from './components/NewMessagesSeparator';
import { UnreadMessagesPill } from './components/UnreadMessagesPill';
import { useUnreadTracking } from './use-unread-tracking';
import type { MessagingAttachment, MessagingBusinessReference, MessagingMention, MessagingMessage } from '../../messaging-types';

export interface MessageThreadProps {
  hasConversation: boolean;
  messages: MessagingMessage[];
  emptyStateLabel: React.ReactNode;
  mentionOptions: MessagingMention[];
  businessReferenceOptions: MessagingBusinessReference[];
  onAttachmentDownload?: (attachment: MessagingAttachment, message: MessagingMessage) => Promise<void>;
  onBusinessReferenceClick?: (reference: MessagingBusinessReference) => void;
  /** MAIR-1160: key of the open conversation (null without one). */
  conversationKey?: string | null;
  /** MAIR-1160: unread messages of the open conversation, oldest first. */
  unreadIds?: string[];
  /** MAIR-1160: mark the conversation read (end of the thread reached by the agent, or thread without scroll). */
  onRead?: () => void;
}

const noIds: string[] = [];

/** Centred empty state of the thread (MAIR-870, Figma F1); a ready-made DataState is rendered as is. */
const ThreadPlaceholder = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center text-center">
    {typeof children === 'string' ? <Text as="p" size="s" tone="muted">{children}</Text> : children}
  </div>
);

/**
 * Scrollable message region; the ref lets the read action measure what is visible. MAIR-1160: opens on the first
 * unread message after the « Nouveaux messages » separator and floats the unread pill at its bottom.
 */
export const MessageThread = React.forwardRef<HTMLDivElement, MessageThreadProps>(({
  hasConversation, messages, emptyStateLabel, mentionOptions, businessReferenceOptions,
  onAttachmentDownload, onBusinessReferenceClick, conversationKey = null, unreadIds = noIds, onRead,
}, ref) => {
  const region = React.useRef<HTMLDivElement | null>(null);
  const setRegion = React.useCallback((node: HTMLDivElement | null) => {
    region.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  const messageIds = React.useMemo(() => messages.map((message) => String(message.id)), [messages]);
  const tracking = useUnreadTracking(region, hasConversation ? conversationKey : null, messageIds, unreadIds, onRead);

  return (
    <div ref={setRegion} className="min-h-[340px] flex-1 space-y-5 overflow-y-auto bg-[var(--mairie-surface)] px-4 py-5 sm:px-5">
      {!hasConversation
        ? <ThreadPlaceholder>{emptyStateLabel}</ThreadPlaceholder>
        : messages.length === 0
          ? <ThreadPlaceholder>Aucun message dans cette conversation.</ThreadPlaceholder>
          : messages.map((message) => (
            <React.Fragment key={message.id}>
              {tracking.separatorBeforeId === String(message.id) && <NewMessagesSeparator />}
              <MessagingMessageBubble
                onAttachmentDownload={onAttachmentDownload}
                message={message}
                data-messaging-message-id={String(message.id)}
                mentionOptions={mentionOptions}
                businessReferenceOptions={businessReferenceOptions}
                onBusinessReferenceClick={onBusinessReferenceClick}
              />
            </React.Fragment>
          ))}
      {hasConversation && <UnreadMessagesPill count={tracking.remaining} visible={tracking.pillVisible} onClick={tracking.scrollToEnd} />}
    </div>
  );
});
MessageThread.displayName = 'MessageThread';
