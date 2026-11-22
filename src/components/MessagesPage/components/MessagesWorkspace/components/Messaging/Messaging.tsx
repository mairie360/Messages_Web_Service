import React from 'react';

import { joinClasses } from './messaging-style';
import { CreateGroupModal } from './components/CreateGroupModal';
import { MessagingChatHeader } from './components/MessagingChatHeader';
import { MessagingSidebar } from './components/MessagingSidebar';
import { NewMessageModal } from './components/NewMessageModal';
import { buildMentionOptions, buildSendPayload, closeWhenConfirmed, getMessageDirection, mergeMessagesById, messagingIdsMatch, directContactIds, unreadMessageIds, withSentStatus } from './messaging-model';
import { ContextReferenceBar } from './components/ContextReferenceBar';
import { ConversationSearchPanel } from './components/ConversationSearchPanel';
import { revealMessage } from './reveal-message';
import { ConversationComposers } from './components/ConversationComposers';
import { MessageThread } from './components/MessageThread';
import { ReadFailureAlert } from './components/ReadFailureAlert';
import { useVisibleMessagesRead } from './use-visible-messages-read';
import { attemptMessage, useSendAttempts } from './use-send-attempts';
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
  MessagingSearchPage,
  MessagingSearchPersonItem,
  MessagingSearchRequest,
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
  /** MAIR-1158: header « Rechercher dans la conversation », shown only when given. */
  onSearchConversation?: (conversation: MessagingConversation) => void;
  /** MAIR-1163: « Gérer les membres » in « Plus d'actions », shown only when given. */
  onManageMembers?: (conversation: MessagingConversation) => void;
  onMoreActions?: (conversation: MessagingConversation) => void;
  /**
   * MAIR-1164: search in the open conversation. With it, « Rechercher dans la conversation » (header and
   * « Plus d'actions ») opens the search panel instead of calling `onSearchConversation`.
   */
  onSearch?: (conversation: MessagingConversation, request: MessagingSearchRequest) => Promise<MessagingSearchPage>;
  /**
   * MAIR-1164: a message chosen in the search is not in the loaded page of the thread; the consumer may load
   * around it. Without it nothing more happens.
   */
  onMessageNotLoaded?: (conversation: MessagingConversation, messageId: MessagingContactId) => void;
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
  emptyStateLabel,
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
  onSearchConversation,
  onManageMembers,
  onMoreActions,
  onSearch,
  onMessageNotLoaded,
  className = '',
  ...props
}: MessagingProps) => {
  const [newMessageOpen, setNewMessageOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  // MAIR-1163: « Créer un groupe avec <personne> » preselects the contact once the contacts are known.
  const [groupWith, setGroupWith] = React.useState<MessagingConversation | null>(null);
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
  // MAIR-1160: the banner is gone; the thread shows a separator and a pill for the unread messages.
  const unreadIdsKey = unreadMessageIds(visibleMessages, activeConversation?.unreadCount).join(',');
  const activeUnreadIds = React.useMemo(() => (unreadIdsKey ? unreadIdsKey.split(',') : []), [unreadIdsKey]);

  const { messageRegionRef, readPending, readFailure, readVisibleMessages } =
    useVisibleMessagesRead(resolvedActiveId, visibleMessages, onReadVisibleMessages);

  const handleConversationSelect = (conversation: MessagingConversation) => {
    if (activeConversationId === undefined) {
      setInternalActiveId(conversation.id);
    }

    onConversationSelect?.(conversation);
  };

  const [newMessageRecipient, setNewMessageRecipient] = React.useState<MessagingContactId | undefined>();
  const handleNewMessageClick = (recipientId?: MessagingContactId) => {
    setNewMessageRecipient(recipientId);
    setNewMessageOpen(true);
    onNewMessageClick?.();
  };

  // MAIR-1164: « Rechercher dans la conversation » opens the search panel of the open conversation.
  const [searchOpen, setSearchOpen] = React.useState(false);
  const activeKey = activeConversation ? String(activeConversation.id) : null;
  React.useEffect(() => { setSearchOpen(false); }, [activeKey]);
  const searchActive = React.useCallback(
    (request: MessagingSearchRequest) => (activeConversation && onSearch
      ? onSearch(activeConversation, request)
      : Promise.reject(new Error('Aucune conversation ouverte.'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one search function per open conversation
    [activeKey, onSearch],
  );
  const openSearchResult = (messageId: MessagingContactId) => {
    const conversation = activeConversation;
    // The drawer gives the focus back to its opener first; the thread then moves to the message.
    window.setTimeout(() => {
      if (!revealMessage(messageRegionRef.current, messageId) && conversation) onMessageNotLoaded?.(conversation, messageId);
    }, 0);
  };
  const writeTo = (person: MessagingSearchPersonItem) => {
    const direct = displayedConversations.find((conversation) => conversation.kind !== 'group' &&
      conversation.contactId !== undefined && String(conversation.contactId).replace(/^user-/, '') === String(person.id).replace(/^user-/, ''));
    if (direct) handleConversationSelect(direct);
    else if (onNewMessageSend) handleNewMessageClick(person.id);
  };

  const groupWithIds = React.useMemo(
    () => (groupWith ? directContactIds(groupWith, displayedContacts) : []),
    [groupWith, displayedContacts],
  );

  const handleCreateGroupClick = (withConversation: MessagingConversation | null = null) => {
    setGroupWith(withConversation);
    setCreateGroupOpen(true);
    onCreateGroupClick?.();
  };

  // MAIR-1162: my sends are shown in the thread with their state until the consumer confirms them.
  const sends = useSendAttempts(onSendMessage);
  const handleSendMessage = (
    conversationId: MessagingContactId,
    content: string,
    attachments?: MessagingAttachment[],
    mentions?: MessagingMention[],
    businessLinks?: MessagingBusinessReference[]
  ) => sends.send(buildSendPayload(conversationId, content, { attachments, mentions, businessLinks, context: contextReference }));
  const pendingMessages = sends.attempts
    .filter((attempt) => messagingIdsMatch(attempt.conversationId, resolvedActiveId))
    .map(attemptMessage);
  const threadMessages = React.useMemo(() => withSentStatus(visibleMessages),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed with the displayed messages
    [displayedMessages, resolvedActiveId, currentUserId]);

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
        'grid min-h-[560px] overflow-hidden rounded-[var(--mairie-radius-l)] border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] lg:h-[692px] lg:grid-cols-[320px_minmax(0,1fr)]',
        className
      )}
      {...props}
    >
      <MessagingSidebar
        conversations={displayedConversations}
        activeConversationId={resolvedActiveId}
        onConversationSelect={handleConversationSelect}
        onNewMessageClick={onNewMessageSend ? () => handleNewMessageClick() : undefined}
        onCreateGroupClick={onCreateGroup ? () => handleCreateGroupClick() : undefined}
      />

      <div className="flex min-h-0 flex-col bg-[var(--mairie-surface)]">
        <MessagingChatHeader
          key={activeConversation ? String(activeConversation.id) : 'no-conversation'}
          conversation={activeConversation}
          onSearchConversation={onSearch ? () => setSearchOpen(true) : onSearchConversation}
          onMoreActions={onMoreActions}
          onDeleteConversation={onConversationDelete ? handleDeleteConversation : undefined}
          onReadVisibleMessages={onReadVisibleMessages ? conversation => void readVisibleMessages(conversation, { untilLast: true }) : undefined}
          onManageMembers={onManageMembers}
          onCreateGroupWith={onCreateGroup ? conversation => handleCreateGroupClick(conversation) : undefined}
          readPending={readPending}
        />

        {readFailure && messagingIdsMatch(readFailure.conversationId, resolvedActiveId) && (
          <ReadFailureAlert message={readFailure.message} />
        )}

        <MessageThread
          ref={messageRegionRef}
          hasConversation={activeConversation !== null}
          messages={threadMessages}
          emptyStateLabel={emptyStateLabel}
          conversationCount={displayedConversations.length}
          mentionOptions={displayedMentionOptions}
          businessReferenceOptions={businessReferences}
          onAttachmentDownload={onAttachmentDownload}
          onBusinessReferenceClick={onBusinessReferenceClick}
          conversationKey={activeConversation ? String(activeConversation.id) : null}
          unreadIds={activeUnreadIds}
          onRead={onReadVisibleMessages && activeConversation ? () => void readVisibleMessages(activeConversation) : undefined}
          pendingMessages={pendingMessages}
          onRetrySend={(message) => message.conversationId !== undefined && sends.retry(message.conversationId)}
          sendAnnouncement={sends.announcement}
        />

        {contextReference && <ContextReferenceBar reference={contextReference} onOpen={onBusinessReferenceClick} />}

        <ConversationComposers
          key={currentUserId === undefined ? 'anonymous' : `account:${String(currentUserId)}`}
          conversations={displayedConversations}
          activeConversation={activeConversation}
          mentionOptions={displayedMentionOptions}
          businessReferenceOptions={businessReferences}
          onSendMessage={onSendMessage ? handleSendMessage : undefined}
          releasedDrafts={sends.released}
          onAttach={onAttach}
          onEmoji={onEmoji}
        />
      </div>

      {onSearch && (
        <ConversationSearchPanel
          open={searchOpen}
          conversation={activeConversation}
          currentUserId={currentUserId}
          onClose={() => setSearchOpen(false)}
          onSearch={searchActive}
          onOpenMessage={openSearchResult}
          onWriteTo={writeTo}
        />
      )}
      {onNewMessageSend && (
        <NewMessageModal
          isOpen={newMessageOpen}
          contacts={displayedContacts}
          initialRecipientId={newMessageRecipient}
          onCancel={() => setNewMessageOpen(false)}
          onSendMessage={handleSendNewMessage}
        />
      )}
      {onCreateGroup && (
        <CreateGroupModal
          isOpen={createGroupOpen}
          members={displayedContacts}
          initialMemberIds={groupWithIds}
          onCancel={() => setCreateGroupOpen(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </section>
  );
};
