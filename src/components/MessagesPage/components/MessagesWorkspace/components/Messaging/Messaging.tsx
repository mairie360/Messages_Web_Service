import React from 'react';

import { joinClasses } from './messaging-style';
import { CreateGroupModal } from './components/CreateGroupModal';
import { MessagingChatHeader } from './components/MessagingChatHeader';
import { MessagingSidebar } from './components/MessagingSidebar';
import { NewMessageModal } from './components/NewMessageModal';
import { buildMentionOptions, buildSendPayload, closeWhenConfirmed, getMessageDirection, mergeMessagesById, messagingIdsMatch } from './messaging-model';
import { ContextReferenceBar } from './components/ContextReferenceBar';
import { ConversationComposers } from './components/ConversationComposers';
import { MessageThread } from './components/MessageThread';
import { ReadFailureAlert } from './components/ReadFailureAlert';
import { UnreadNotificationsBar } from './components/UnreadNotificationsBar';
import { useVisibleMessagesRead } from './use-visible-messages-read';
import type {
  CreateGroupPayload,
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMention,
  MessagingMessage,
  MessagingSendMessagePayload,
  MessagingSendResult,
  NewMessagePayload,
} from './messaging-types';

export interface MessagingProps extends React.HTMLAttributes<HTMLElement> {
  conversations?: MessagingConversation[];
  contacts?: MessagingConversation[];
  messages?: MessagingMessage[];
  incomingMessages?: MessagingMessage[];
  mentionOptions?: MessagingMention[];
  businessReferences?: MessagingBusinessReference[];
  contextReference?: MessagingBusinessReference;
  activeConversationId?: MessagingContactId;
  defaultActiveConversationId?: MessagingContactId;
  currentUserId?: MessagingContactId;
  emptyStateLabel?: React.ReactNode;
  onConversationSelect?: (conversation: MessagingConversation) => void;
  onNewMessageClick?: () => void;
  onCreateGroupClick?: () => void;
  onSendMessage?: (payload: MessagingSendMessagePayload) => MessagingSendResult;
  onNewMessageSend?: (payload: NewMessagePayload) => MessagingSendResult;
  onCreateGroup?: (payload: CreateGroupPayload) => MessagingSendResult;
  onConversationDelete?: (conversation: MessagingConversation) => void;
  onReadVisibleMessages?: (conversation: MessagingConversation, lastVisibleMessage: MessagingMessage | null) => MessagingSendResult;
  onAttachmentDownload?: (attachment: MessagingAttachment, message: MessagingMessage) => Promise<void>;
  onAttach?: (files: File[], attachments: MessagingAttachment[]) => void;
  onEmoji?: (emoji: string) => void;
  onBusinessReferenceClick?: (reference: MessagingBusinessReference) => void;
  onCall?: (conversation: MessagingConversation) => void;
  onVideoCall?: (conversation: MessagingConversation) => void;
  onMoreActions?: (conversation: MessagingConversation) => void;
}

const emptyConversations: MessagingConversation[] = [];
const emptyMessages: MessagingMessage[] = [];
const emptyBusinessReferences: MessagingBusinessReference[] = [];

export const Messaging = ({
  conversations,
  contacts,
  messages,
  incomingMessages = emptyMessages,
  mentionOptions,
  businessReferences = emptyBusinessReferences,
  contextReference,
  activeConversationId,
  defaultActiveConversationId,
  currentUserId,
  emptyStateLabel = 'Sélectionnez une conversation pour commencer.',
  onConversationSelect,
  onNewMessageClick,
  onCreateGroupClick,
  onSendMessage,
  onNewMessageSend,
  onCreateGroup,
  onConversationDelete,
  onReadVisibleMessages,
  onAttach,
  onAttachmentDownload,
  onEmoji,
  onBusinessReferenceClick,
  onCall,
  onVideoCall,
  onMoreActions,
  className = '',
  ...props
}: MessagingProps) => {
  const [newMessageOpen, setNewMessageOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const displayedConversations = conversations ?? emptyConversations;
  const displayedContacts =
    contacts ?? displayedConversations.filter((conversation) => conversation.kind !== 'group');
  const displayedMentionOptions =
    mentionOptions ?? buildMentionOptions(displayedContacts, displayedConversations);
  const firstConversationId = displayedConversations[0]?.id;
  const [internalActiveId, setInternalActiveId] = React.useState<MessagingContactId | undefined>();
  const preferredActiveId = internalActiveId ?? defaultActiveConversationId;
  const resolvedActiveId =
    activeConversationId ??
    (displayedConversations.some((conversation) => messagingIdsMatch(conversation.id, preferredActiveId))
      ? preferredActiveId
      : firstConversationId);
  const activeConversation =
    displayedConversations.find((conversation) => messagingIdsMatch(conversation.id, resolvedActiveId)) ?? null;
  const displayedMessages = mergeMessagesById(messages ?? emptyMessages, incomingMessages);
  const visibleMessages = displayedMessages
    .filter(
      (message) =>
        message.conversationId === undefined || messagingIdsMatch(message.conversationId, resolvedActiveId)
    )
    .map((message) => ({
      ...message,
      direction: getMessageDirection(message, currentUserId),
    }));
  const unreadNotificationCount = displayedConversations.reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0
  );
  const firstUnreadConversation = displayedConversations.find((conversation) => (conversation.unreadCount ?? 0) > 0);

  const { messageRegionRef, readPending, readFailure, readVisibleMessages } =
    useVisibleMessagesRead(resolvedActiveId, visibleMessages, onReadVisibleMessages);

  const handleConversationSelect = (conversation: MessagingConversation) => {
    if (activeConversationId === undefined) {
      setInternalActiveId(conversation.id);
    }

    onConversationSelect?.(conversation);
  };

  const handleNewMessageClick = () => {
    setNewMessageOpen(true);
    onNewMessageClick?.();
  };

  const handleCreateGroupClick = () => {
    setCreateGroupOpen(true);
    onCreateGroupClick?.();
  };

  const handleSendMessage = (
    conversationId: MessagingContactId,
    content: string,
    attachments?: MessagingAttachment[],
    mentions?: MessagingMention[],
    businessLinks?: MessagingBusinessReference[]
  ) => onSendMessage?.(buildSendPayload(conversationId, content, { attachments, mentions, businessLinks, context: contextReference }));

  const handleSendNewMessage = (payload: NewMessagePayload) =>
    closeWhenConfirmed(onNewMessageSend?.(payload), () => setNewMessageOpen(false));

  const handleCreateGroup = (payload: CreateGroupPayload) =>
    closeWhenConfirmed(onCreateGroup?.(payload), () => setCreateGroupOpen(false));

  const handleDeleteConversation = (conversationToDelete: MessagingConversation) => {
    onConversationDelete?.(conversationToDelete);
  };

  return (
    <section
      className={joinClasses(
        'grid min-h-[560px] overflow-hidden rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] lg:h-[692px] lg:grid-cols-[320px_minmax(0,1fr)]',
        className
      )}
      {...props}
    >
      <MessagingSidebar
        conversations={displayedConversations}
        activeConversationId={resolvedActiveId}
        onConversationSelect={handleConversationSelect}
        onNewMessageClick={onNewMessageSend ? handleNewMessageClick : undefined}
        onCreateGroupClick={onCreateGroup ? handleCreateGroupClick : undefined}
      />

      <div className="flex min-h-0 flex-col bg-[var(--mairie-surface)]">
        <MessagingChatHeader
          key={activeConversation ? String(activeConversation.id) : 'no-conversation'}
          conversation={activeConversation}
          onCall={onCall}
          onVideoCall={onVideoCall}
          onMoreActions={onMoreActions}
          onDeleteConversation={onConversationDelete ? handleDeleteConversation : undefined}
          onReadVisibleMessages={onReadVisibleMessages ? conversation => void readVisibleMessages(conversation) : undefined}
          readPending={readPending}
        />

        {readFailure && messagingIdsMatch(readFailure.conversationId, resolvedActiveId) && (
          <ReadFailureAlert message={readFailure.message} />
        )}

        {unreadNotificationCount > 0 && (
          <UnreadNotificationsBar
            count={unreadNotificationCount}
            firstUnreadConversation={firstUnreadConversation}
            onOpen={handleConversationSelect}
          />
        )}

        <MessageThread
          ref={messageRegionRef}
          hasConversation={activeConversation !== null}
          messages={visibleMessages}
          emptyStateLabel={emptyStateLabel}
          mentionOptions={displayedMentionOptions}
          businessReferenceOptions={businessReferences}
          onAttachmentDownload={onAttachmentDownload}
          onBusinessReferenceClick={onBusinessReferenceClick}
        />

        {contextReference && <ContextReferenceBar reference={contextReference} onOpen={onBusinessReferenceClick} />}

        <ConversationComposers
          key={currentUserId === undefined ? 'anonymous' : `account:${String(currentUserId)}`}
          conversations={displayedConversations}
          activeConversation={activeConversation}
          mentionOptions={displayedMentionOptions}
          businessReferenceOptions={businessReferences}
          onSendMessage={onSendMessage ? handleSendMessage : undefined}
          onAttach={onAttach}
          onEmoji={onEmoji}
        />
      </div>

      {onNewMessageSend && (
        <NewMessageModal
          isOpen={newMessageOpen}
          contacts={displayedContacts}
          onCancel={() => setNewMessageOpen(false)}
          onSendMessage={handleSendNewMessage}
        />
      )}
      {onCreateGroup && (
        <CreateGroupModal
          isOpen={createGroupOpen}
          members={displayedContacts}
          onCancel={() => setCreateGroupOpen(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </section>
  );
};
