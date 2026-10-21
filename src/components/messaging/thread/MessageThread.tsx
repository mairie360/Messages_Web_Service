import React from 'react';

import { MessagingMessageBubble } from '../MessagingMessageBubble';
import type { MessagingAttachment, MessagingBusinessReference, MessagingMention, MessagingMessage } from '../types';

export interface MessageThreadProps {
  hasConversation: boolean;
  messages: MessagingMessage[];
  emptyStateLabel: React.ReactNode;
  mentionOptions: MessagingMention[];
  businessReferenceOptions: MessagingBusinessReference[];
  onAttachmentDownload?: (attachment: MessagingAttachment, message: MessagingMessage) => Promise<void>;
  onBusinessReferenceClick?: (reference: MessagingBusinessReference) => void;
}

const ThreadPlaceholder = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center text-sm text-[var(--mairie-muted)]">{children}</div>
);

/** Scrollable message region; the ref lets the read action measure what is visible. */
export const MessageThread = React.forwardRef<HTMLDivElement, MessageThreadProps>(({
  hasConversation, messages, emptyStateLabel, mentionOptions, businessReferenceOptions,
  onAttachmentDownload, onBusinessReferenceClick,
}, ref) => (
  <div ref={ref} className="min-h-[340px] flex-1 space-y-5 overflow-y-auto bg-[var(--mairie-surface)] px-4 py-5 sm:px-5">
    {!hasConversation
      ? <ThreadPlaceholder>{emptyStateLabel}</ThreadPlaceholder>
      : messages.length === 0
        ? <ThreadPlaceholder>Aucun message dans cette conversation.</ThreadPlaceholder>
        : messages.map((message) => (
          <MessagingMessageBubble
            onAttachmentDownload={onAttachmentDownload}
            key={message.id}
            message={message}
            data-messaging-message-id={String(message.id)}
            mentionOptions={mentionOptions}
            businessReferenceOptions={businessReferenceOptions}
            onBusinessReferenceClick={onBusinessReferenceClick}
          />
        ))}
  </div>
));
MessageThread.displayName = 'MessageThread';
