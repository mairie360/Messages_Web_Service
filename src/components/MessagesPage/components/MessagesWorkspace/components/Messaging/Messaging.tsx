import React from 'react';
import { ConfirmModal, ErrorAlert } from '@mairie360/lib-components/primitives';

import { joinClasses } from './messaging-style';
import { CreateGroupModal } from './components/CreateGroupModal';
import { MessagingChatHeader } from './components/MessagingChatHeader';
import { MessagingSidebar } from './components/MessagingSidebar';
import { NewMessageModal } from './components/NewMessageModal';
import { buildMentionOptions, buildSendPayload, closeWhenConfirmed, getMessageDirection, mergeMessagesById, messagingIdsMatch, directContactIds, unreadMessageIds, withSentStatus } from './messaging-model';
import { ContextReferenceBar } from './components/ContextReferenceBar';
import { ConversationSearchPanel } from './components/ConversationSearchPanel';
import { GroupMembersPanel } from './components/GroupMembersPanel';
import { revealMessage } from './reveal-message';
import { ConversationComposers } from './components/ConversationComposers';
import { MessageThread } from './components/MessageThread';
import { MentionedPersonCard } from './components/MentionedPersonCard';
import { ReadFailureAlert } from './components/ReadFailureAlert';
import { useVisibleMessagesRead } from './use-visible-messages-read';
import { attemptMessage, useSendAttempts } from './use-send-attempts';
import { messageExcerpt, threadAuthors } from './messaging-model';
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
  MessagingMember,
  MessagingMembers,
  MessagingMentionSuggestions,
  MessagingEditPayload,
  MessagingSearchPage,
  MessagingSearchPersonItem,
  MessagingSearchRequest,
  NewMessagePayload,
} from './messaging-types';

const CONTEXT_OF: Record<string, string> = { project: 'au projet', task: 'à la tâche', event: 'à l’événement' };
/** Subtitle of « Nouveau message » written in a context: « Message lié au projet « Voirie » ». */
const contextSubtitle = (reference: MessagingBusinessReference) =>
  `Message lié ${CONTEXT_OF[reference.kind] ?? 'à'} « ${reference.title} »`;

export interface MessagingProps extends React.HTMLAttributes<HTMLElement> {
  conversations?: MessagingConversation[];
  contacts?: MessagingConversation[];
  messages?: MessagingMessage[];
  incomingMessages?: MessagingMessage[];
  mentionOptions?: MessagingMention[];
  businessReferences?: MessagingBusinessReference[];
  contextReference?: MessagingBusinessReference;
  /** « Retirer » of the context bar: the next message is no longer linked to the context. */
  onContextRemove?: () => void;
  /** Opens « Nouveau message » each time it changes to a positive value (arrival with a context). */
  newMessageRequest?: number;
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
  /**
   * A message of the open conversation to reveal (a global search result): the thread moves to it and highlights it
   * when it is in the loaded page, then `onMessageRevealed` tells whether it was found.
   */
  revealMessageId?: MessagingContactId;
  onMessageRevealed?: (found: boolean) => void;
  /**
   * MAIR-1165: the members of a group. With it, the header shows the avatar pile of the open group and « Gérer les
   * membres » opens the members panel instead of calling `onManageMembers`.
   */
  onLoadMembers?: (conversation: MessagingConversation, signal: AbortSignal) => Promise<MessagingMembers>;
  /** MAIR-1165: each answers the members after the change, or `false` when it was refused. */
  onAddMembers?: (conversation: MessagingConversation, userIds: MessagingContactId[]) => Promise<MessagingMembers | false>;
  onRemoveMember?: (conversation: MessagingConversation, member: MessagingMember) => Promise<MessagingMembers | false>;
  onLeaveConversation?: (conversation: MessagingConversation) => Promise<boolean>;
  /** MAIR-1166: `@` suggestions of a conversation (Tout le monde, groups and services, members). */
  onSuggestMentions?: (conversation: MessagingConversation, query: string, signal: AbortSignal) => Promise<MessagingMentionSuggestions>;
  /** MAIR-1166: `#` suggestions (projects, events, tasks the agent may read, with the URL of their page). */
  onSuggestLinks?: (query: string, signal: AbortSignal) => Promise<MessagingBusinessReference[]>;
  /**
   * MAIR-1168: save the edit of one of my messages; « Modifier » is offered only with it. Answers whether it was
   * saved; a rejection carries the message shown under the edit box.
   */
  onEditMessage?: (message: MessagingMessage, payload: MessagingEditPayload) => Promise<boolean | void>;
  /**
   * MAIR-1169: delete one of my messages (« Message supprimé » for everyone); « Supprimer » is offered only with it.
   * A rejection carries the message of the danger alert shown above the thread.
   */
  onDeleteMessage?: (message: MessagingMessage) => Promise<boolean | void>;
  /** MAIR-1170: add (`add`) or remove my reaction; a rejection carries the message of the alert above the thread. */
  onToggleReaction?: (message: MessagingMessage, emoji: string, add: boolean) => Promise<unknown>;
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
  onContextRemove,
  newMessageRequest = 0,
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
  revealMessageId,
  onMessageRevealed,
  onLoadMembers,
  onAddMembers,
  onRemoveMember,
  onLeaveConversation,
  onSuggestMentions,
  onSuggestLinks,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
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

  React.useEffect(() => {
    if (newMessageRequest <= 0) return;
    setNewMessageRecipient(undefined);
    setNewMessageOpen(true);
  }, [newMessageRequest]);

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
  // A message asked for by the page (global search link): revealed after the thread has placed itself at opening.
  // A message that is not in the loaded page leaves the conversation open as it is.
  const revealedRef = React.useRef(onMessageRevealed);
  React.useEffect(() => { revealedRef.current = onMessageRevealed; });
  const revealKey = revealMessageId === undefined || revealMessageId === '' || !activeKey ? null : `${activeKey}:${revealMessageId}`;
  React.useEffect(() => {
    if (revealKey === null || revealMessageId === undefined) return undefined;
    const timer = setTimeout(() => {
      const found = revealMessage(messageRegionRef.current, revealMessageId);
      revealedRef.current?.(found);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reveal per conversation and message
  }, [revealKey]);
  // MAIR-1165: members of the open group, read when the panel opens and again when the size of the group changes
  // while it is open (a change made here or by someone else); the header keeps the last ones read.
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [members, setMembers] = React.useState<MessagingMembers | null>(null);
  const [membersError, setMembersError] = React.useState<string | null>(null);
  const [membersAttempt, setMembersAttempt] = React.useState(0);
  const groupKey = activeConversation?.kind === 'group' && onLoadMembers ? String(activeConversation.id) : null;
  React.useEffect(() => { setMembersOpen(false); setMembers(null); }, [groupKey]);
  React.useEffect(() => {
    if (!membersOpen || !groupKey || !activeConversation || !onLoadMembers) return;
    const controller = new AbortController();
    setMembersError(null);
    onLoadMembers(activeConversation, controller.signal)
      .then(next => { if (!controller.signal.aborted) setMembers(next); })
      .catch(() => { if (!controller.signal.aborted) setMembersError('Les membres du groupe sont indisponibles.'); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reloaded per group, size change or retry
  }, [membersOpen, groupKey, activeConversation?.memberCount, membersAttempt, onLoadMembers]);
  const changeMembers = async (change: Promise<MessagingMembers | false> | undefined) => {
    const next = await change;
    if (!next) return false;
    setMembers(next);
    return true;
  };

  const writeTo = (person: MessagingSearchPersonItem) => {
    const direct = displayedConversations.find((conversation) => conversation.kind !== 'group' &&
      conversation.contactId !== undefined && String(conversation.contactId).replace(/^user-/, '') === String(person.id).replace(/^user-/, ''));
    if (direct) handleConversationSelect(direct);
    else if (onNewMessageSend) handleNewMessageClick(person.id);
  };

  // A `@person` tag of a message opens that person's card (department and presence from the contacts); « Écrire »
  // opens the direct conversation with them, or « Nouveau message » to them when there is none yet.
  const [mentionedPerson, setMentionedPerson] = React.useState<{ id: string; name: string } | null>(null);
  const sameUser = (left: MessagingContactId | undefined, right: MessagingContactId | undefined) =>
    left !== undefined && right !== undefined && String(left).replace(/^user-/, '') === String(right).replace(/^user-/, '');
  const mentionedContact = mentionedPerson
    ? displayedContacts.find((contact) => sameUser(contact.id, mentionedPerson.id))
    : undefined;
  const mentionedIsMe = mentionedPerson !== null && sameUser(mentionedPerson.id, currentUserId);
  const canWriteToMentioned = mentionedPerson !== null && !mentionedIsMe && (
    displayedConversations.some((conversation) => conversation.kind !== 'group' && sameUser(conversation.contactId, mentionedPerson.id)) ||
    (onNewMessageSend !== undefined && mentionedContact !== undefined));

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
  // MAIR-1167: the message each conversation answers (« Répondre »), until the reply is sent or cancelled.
  const [replies, setReplies] = React.useState<Record<string, MessagingMessage>>({});
  const setReply = (conversationId: MessagingContactId, message: MessagingMessage | null) => setReplies((current) => {
    const next = { ...current };
    if (message) next[String(conversationId)] = message; else delete next[String(conversationId)];
    return next;
  });
  const handleSendMessage = (
    conversationId: MessagingContactId,
    content: string,
    attachments?: MessagingAttachment[],
    mentions?: MessagingMention[],
    businessLinks?: MessagingBusinessReference[]
  ) => {
    const reply = replies[String(conversationId)];
    const payload = buildSendPayload(conversationId, content, { attachments, mentions, businessLinks, context: contextReference });
    if (reply) payload.replyTo = reply.id;
    return closeWhenConfirmed(sends.send(payload), () => {
      // A newer « Répondre » chosen while sending is kept.
      if (reply) setReplies((current) => {
        if (current[String(conversationId)] !== reply) return current;
        const next = { ...current };
        delete next[String(conversationId)];
        return next;
      });
    });
  };
  // MAIR-1168: one of my messages edited in place, closed once saved or when the conversation changes.
  const [editingId, setEditingId] = React.useState<MessagingContactId | null>(null);
  React.useEffect(() => { setEditingId(null); }, [activeKey]);
  const saveEdit = async (message: MessagingMessage, payload: MessagingEditPayload) => {
    const saved = await onEditMessage?.(message, payload);
    if (saved !== false) setEditingId(null);
    return saved;
  };
  const suggestionSources = {
    mentions: onSuggestMentions && activeConversation
      ? (query: string, signal: AbortSignal) => onSuggestMentions(activeConversation, query, signal) : undefined,
    links: onSuggestLinks,
  };

  // MAIR-1169 / MAIR-1170: the deletion of one of my messages is confirmed first; a failed deletion or reaction keeps
  // the message and says why above the thread.
  const [deleting, setDeleting] = React.useState<MessagingMessage | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  React.useEffect(() => { setDeleting(null); setActionError(null); }, [activeKey]);
  const toggleReaction = async (message: MessagingMessage, emoji: string, add: boolean) => {
    setActionError(null);
    try {
      await onToggleReaction?.(message, emoji, add);
    } catch (failure) {
      setActionError(failure instanceof Error && failure.message ? failure.message : 'La réaction n’a pas pu être enregistrée.');
    }
  };
  const confirmDelete = async () => {
    const message = deleting;
    setDeleting(null);
    if (!message || !onDeleteMessage) return;
    setActionError(null);
    try {
      if (await onDeleteMessage(message) === false) setActionError('Le message n’a pas pu être supprimé.');
    } catch (failure) {
      setActionError(failure instanceof Error && failure.message ? failure.message : 'Le message n’a pas pu être supprimé.');
    }
  };

  const openQuote = (messageId: MessagingContactId) => {
    if (!revealMessage(messageRegionRef.current, messageId) && activeConversation) onMessageNotLoaded?.(activeConversation, messageId);
  };
  const pendingMessages = sends.attempts
    .filter((attempt) => messagingIdsMatch(attempt.conversationId, resolvedActiveId))
    .map(attemptMessage);
  const threadMessages = React.useMemo(() => withSentStatus(visibleMessages),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed with the displayed messages
    [displayedMessages, resolvedActiveId, currentUserId]);
  const groupAuthors = React.useMemo(() => threadAuthors(threadMessages), [threadMessages]);

  const handleSendNewMessage = (payload: NewMessagePayload) =>
    closeWhenConfirmed(onNewMessageSend?.(contextReference ? { ...payload, context: contextReference } : payload), () => setNewMessageOpen(false));

  const handleCreateGroup = (payload: CreateGroupPayload) =>
    closeWhenConfirmed(onCreateGroup?.(payload), () => setCreateGroupOpen(false));

  const handleDeleteConversation = (conversationToDelete: MessagingConversation) => {
    onConversationDelete?.(conversationToDelete);
  };

  return (
    <section
      className={joinClasses(
        'grid min-h-[560px] overflow-hidden rounded-[var(--mairie-radius-l)] border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] lg:grid-cols-[320px_minmax(0,1fr)]',
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
          onManageMembers={onLoadMembers ? () => setMembersOpen(true) : onManageMembers}
          members={members?.members ?? (activeConversation?.kind === 'group' ? groupAuthors : undefined)}
          onCreateGroupWith={onCreateGroup ? conversation => handleCreateGroupClick(conversation) : undefined}
          readPending={readPending}
        />

        {readFailure && messagingIdsMatch(readFailure.conversationId, resolvedActiveId) && (
          <ReadFailureAlert message={readFailure.message} />
        )}

        {actionError && (
          <ErrorAlert size="s" className="mx-4 mt-3" title={actionError} onDismiss={() => setActionError(null)} />
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
          currentUserId={currentUserId}
          onReply={onSendMessage && activeConversation ? (message) => setReply(activeConversation.id, message) : undefined}
          onOpenQuote={openQuote}
          onMentionPersonClick={setMentionedPerson}
          onEdit={onEditMessage ? (message) => { if (!message.deleted) setEditingId(message.id); } : undefined}
          onDelete={onDeleteMessage ? (message) => { if (!message.deleted) setDeleting(message); } : undefined}
          onToggleReaction={onToggleReaction ? toggleReaction : undefined}
          editingId={editingId}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId(null)}
          suggestionSources={suggestionSources}
        />

        {contextReference && <ContextReferenceBar reference={contextReference} onOpen={onBusinessReferenceClick} onRemove={onContextRemove} />}

        <ConversationComposers
          key={currentUserId === undefined ? 'anonymous' : `account:${String(currentUserId)}`}
          conversations={displayedConversations}
          activeConversation={activeConversation}
          mentionOptions={displayedMentionOptions}
          businessReferenceOptions={businessReferences}
          onSendMessage={onSendMessage ? handleSendMessage : undefined}
          releasedDrafts={sends.released}
          replies={Object.fromEntries(Object.entries(replies).map(([id, message]) => [id, { id: message.id, authorName: message.authorName, excerpt: messageExcerpt(message) }]))}
          onCancelReply={(conversationId) => setReply(conversationId, null)}
          onSuggestMentions={onSuggestMentions}
          onSuggestLinks={onSuggestLinks}
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
      {onDeleteMessage && (
        <ConfirmModal
          open={deleting !== null}
          role="alertdialog"
          title="Supprimer le message ?"
          message="Le message sera remplacé par « Message supprimé » pour tous les participants."
          confirmLabel="Supprimer"
          initialFocus="cancel"
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {onLoadMembers && (
        <GroupMembersPanel
          open={membersOpen}
          conversation={activeConversation?.kind === 'group' ? activeConversation : null}
          members={members}
          loadError={membersError}
          currentUserId={currentUserId}
          contacts={displayedContacts}
          onClose={() => setMembersOpen(false)}
          onRetry={() => setMembersAttempt(value => value + 1)}
          onAdd={onAddMembers && activeConversation ? userIds => changeMembers(onAddMembers(activeConversation, userIds)) : undefined}
          onRemove={onRemoveMember && activeConversation ? member => changeMembers(onRemoveMember(activeConversation, member)) : undefined}
          onLeave={onLeaveConversation && activeConversation ? async () => {
            const left = await onLeaveConversation(activeConversation);
            if (left) setMembersOpen(false);
            return left;
          } : undefined}
        />
      )}
      {mentionedPerson && (
        <MentionedPersonCard
          person={{ ...mentionedContact, id: mentionedPerson.id, name: mentionedContact?.name ?? mentionedPerson.name }}
          isCurrentUser={mentionedIsMe}
          onWrite={canWriteToMentioned ? () => {
            // The contact's own id, so that « Nouveau message » preselects them whatever form the tag carried.
            const person = { id: mentionedContact?.id ?? mentionedPerson.id, name: mentionedPerson.name };
            setMentionedPerson(null);
            writeTo(person);
          } : undefined}
          onClose={() => setMentionedPerson(null)}
        />
      )}
      {onNewMessageSend && (
        <NewMessageModal
          isOpen={newMessageOpen}
          contacts={displayedContacts}
          initialRecipientId={newMessageRecipient}
          subtitle={contextReference ? contextSubtitle(contextReference) : undefined}
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
