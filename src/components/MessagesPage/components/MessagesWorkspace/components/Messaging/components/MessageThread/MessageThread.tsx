import React from 'react';
import { DataState, Text } from '@mairie360/lib-components/primitives';

import { MessagingMessageBubble } from './components/MessagingMessageBubble';
import { NewMessagesSeparator } from './components/NewMessagesSeparator';
import { SystemNote } from './components/SystemNote';
import { UnreadMessagesPill } from './components/UnreadMessagesPill';
import { useUnreadTracking } from './use-unread-tracking';
import type { MessagingAttachment, MessagingBusinessReference, MessagingContactId, MessagingMention, MessagingMessage } from '../../messaging-types';

export interface MessageThreadProps {
  hasConversation: boolean;
  messages: MessagingMessage[];
  /** A consumer placeholder (loading text, ready-made DataState); without it the thread picks its empty state. */
  emptyStateLabel?: React.ReactNode;
  /** MAIR-1171: conversations of the list, to tell « no conversation at all » from « nothing selected ». */
  conversationCount?: number;
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
  /** MAIR-1162: my sends not confirmed yet (« Envoi… », « Non envoyé »), shown after the messages. */
  pendingMessages?: MessagingMessage[];
  onRetrySend?: (message: MessagingMessage) => void;
  /** MAIR-1162: last send state, spoken by the polite live region of the thread. */
  sendAnnouncement?: string;
  /** MAIR-1165: the agent, to word the system notes (« Vous avez ajouté… »). */
  currentUserId?: MessagingContactId;
}

const noMessages: MessagingMessage[] = [];

const noIds: string[] = [];

/** Centred empty state of the thread (MAIR-870, Figma F1); a ready-made DataState is rendered as is. */
const ThreadPlaceholder = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center text-center">
    {typeof children === 'string' ? <Text as="p" size="s" tone="muted">{children}</Text> : children}
  </div>
);

/**
 * MAIR-1171 (Figma F1 / F6): one illustrated visual per screen. No conversation at all: « Commencez à échanger »
 * (the list only says it in a short text); a list without selection: « Sélectionnez une conversation »; both are lib
 * `DataState` empty at size m (illustrated). An empty conversation: « Aucun message pour l'instant », size s (icon).
 */
const defaultThreadState = (conversationCount: number) => (conversationCount === 0
  ? <DataState state="empty" size="m" title="Commencez à échanger" description="Écrivez un message ou créez un groupe avec le bouton « + » de la liste." />
  : <DataState state="empty" size="m" title="Sélectionnez une conversation" description="Choisissez une conversation dans la liste pour afficher ses messages." />);

/**
 * Scrollable message region; the ref lets the read action measure what is visible. MAIR-1160: opens on the first
 * unread message after the « Nouveaux messages » separator and floats the unread pill at its bottom.
 */
export const MessageThread = React.forwardRef<HTMLDivElement, MessageThreadProps>(({
  hasConversation, messages, emptyStateLabel, mentionOptions, businessReferenceOptions,
  onAttachmentDownload, onBusinessReferenceClick, conversationKey = null, unreadIds = noIds, onRead,
  pendingMessages = noMessages, onRetrySend, sendAnnouncement = '', conversationCount = 0, currentUserId,
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
        ? <ThreadPlaceholder>{emptyStateLabel ?? defaultThreadState(conversationCount)}</ThreadPlaceholder>
        : messages.length === 0 && pendingMessages.length === 0
          ? <ThreadPlaceholder><DataState state="empty" size="s" title="Aucun message pour l’instant" /></ThreadPlaceholder>
          : messages.map((message) => (
            <React.Fragment key={message.id}>
              {tracking.separatorBeforeId === String(message.id) && <NewMessagesSeparator />}
              {message.kind === 'system' ? (
                <SystemNote message={message} currentUserId={currentUserId} data-messaging-message-id={String(message.id)} />
              ) : <MessagingMessageBubble
                onAttachmentDownload={onAttachmentDownload}
                message={message}
                data-messaging-message-id={String(message.id)}
                mentionOptions={mentionOptions}
                businessReferenceOptions={businessReferenceOptions}
                onBusinessReferenceClick={onBusinessReferenceClick}
              />}
            </React.Fragment>
          ))}
      {hasConversation && pendingMessages.map((message) => (
        <MessagingMessageBubble
          key={message.id}
          message={message}
          mentionOptions={mentionOptions}
          businessReferenceOptions={businessReferenceOptions}
          onRetrySend={onRetrySend ? () => onRetrySend(message) : undefined}
        />
      ))}
      <div className="sr-only" role="status" aria-live="polite">{sendAnnouncement}</div>
      {hasConversation && <UnreadMessagesPill count={tracking.remaining} visible={tracking.pillVisible} onClick={tracking.scrollToEnd} />}
    </div>
  );
});
MessageThread.displayName = 'MessageThread';
