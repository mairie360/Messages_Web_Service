import React from 'react';
import { Bell, Briefcase, CalendarDays, ListTodo } from 'lucide-react';

import { joinClasses } from './style';
import { CreateGroupModal } from './CreateGroupModal';
import { MessagingChatHeader } from './MessagingChatHeader';
import { MessagingComposer } from './MessagingComposer';
import { MessagingMessageBubble } from './MessagingMessageBubble';
import { MessagingSidebar } from './MessagingSidebar';
import { NewMessageModal } from './NewMessageModal';
import { lastVisibleMessagingMessageId } from './visible-message';
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
} from './types';

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

interface ConversationComposersProps {
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
  onAttach?: MessagingProps['onAttach'];
  onEmoji?: MessagingProps['onEmoji'];
}

// Keep only visited drafts mounted: switching threads must neither move a draft
// to a different recipient nor discard its pending send, files or references.
// The account key on this component clears the entire in-memory draft session.
const ConversationComposers = ({
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

const messagingIdsMatch = (
  left: MessagingContactId | undefined,
  right: MessagingContactId | undefined
) => left !== undefined && right !== undefined && String(left) === String(right);

const getMessageDirection = (message: MessagingMessage, currentUserId?: MessagingContactId) => {
  if (currentUserId !== undefined && message.authorId !== undefined) {
    return messagingIdsMatch(message.authorId, currentUserId) ? 'outgoing' : 'incoming';
  }
  if (message.direction) return message.direction;

  return 'incoming';
};

const mergeMessagesById = (baseMessages: MessagingMessage[], nextMessages: MessagingMessage[] = []) => {
  const messageIds = new Set(baseMessages.map((message) => String(message.id)));
  const mergedMessages = [...baseMessages];

  nextMessages.forEach((message) => {
    if (messageIds.has(String(message.id))) return;

    mergedMessages.push(message);
    messageIds.add(String(message.id));
  });

  return mergedMessages;
};

const getBusinessReferenceLabel = (reference: MessagingBusinessReference) => {
  if (reference.kind === 'event') return 'Événement';
  if (reference.kind === 'task') return 'Tâche';

  return 'Projet';
};

const buildMentionOptions = (
  contacts: MessagingConversation[],
  conversations: MessagingConversation[]
): MessagingMention[] => {
  const seenMentions = new Set<string>();

  return [
    ...contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      kind: 'direct' as const,
      description: contact.department,
    })),
    ...conversations
      .filter((conversation) => conversation.kind === 'group')
      .map((conversation) => ({
        id: conversation.id,
        name: conversation.name,
        kind: 'group' as const,
        description: conversation.department,
      })),
  ].filter((mention) => {
    const mentionKey = `${mention.kind}:${String(mention.id)}`;

    if (seenMentions.has(mentionKey)) return false;

    seenMentions.add(mentionKey);
    return true;
  });
};

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
  const activeIdRef = React.useRef(resolvedActiveId);
  React.useLayoutEffect(() => { activeIdRef.current = resolvedActiveId; }, [resolvedActiveId]);
  const messageRegionRef = React.useRef<HTMLDivElement>(null);
  const readRequestRef = React.useRef<symbol | null>(null);
  const [readPending, setReadPending] = React.useState(false);
  const [readFailure, setReadFailure] = React.useState<{ conversationId: MessagingContactId; message: string } | null>(null);
  React.useEffect(() => () => { readRequestRef.current = null; }, []);
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

  const handleReadVisibleMessages = async (conversation: MessagingConversation) => {
    if (!onReadVisibleMessages || readRequestRef.current ||
        !messagingIdsMatch(activeIdRef.current, conversation.id)) return;
    const request = Symbol('visible-message-read');
    readRequestRef.current = request;
    setReadPending(true);
    setReadFailure(null);
    try {
      // Let the action menu close before inspecting the actual clipped message region.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (readRequestRef.current !== request ||
          !messagingIdsMatch(activeIdRef.current, conversation.id)) return;
      const id = lastVisibleMessagingMessageId(messageRegionRef.current);
      const lastMessage = id === null ? null : visibleMessages.find(message => String(message.id) === id) ?? null;
      const accepted = await onReadVisibleMessages(conversation, lastMessage);
      if (accepted === false && readRequestRef.current === request &&
          messagingIdsMatch(activeIdRef.current, conversation.id)) {
        setReadFailure({ conversationId: conversation.id, message: 'Les messages affichés n’ont pas pu être marqués comme lus. Réessayez.' });
      }
    } catch {
      if (readRequestRef.current === request && messagingIdsMatch(activeIdRef.current, conversation.id)) {
        setReadFailure({ conversationId: conversation.id, message: 'Les messages affichés n’ont pas pu être marqués comme lus. Réessayez.' });
      }
    } finally {
      if (readRequestRef.current === request) {
        readRequestRef.current = null;
        setReadPending(false);
      }
    }
  };

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
  ) => {
    const payload: MessagingSendMessagePayload = {
      conversationId,
      content,
    };

    if (attachments?.length) {
      payload.attachments = attachments;
    }

    if (mentions?.length) {
      payload.mentions = mentions;
    }

    if (businessLinks?.length) {
      payload.businessLinks = businessLinks;
    }

    if (contextReference) {
      payload.context = contextReference;
    }

    return onSendMessage?.(payload);
  };

  const handleSendNewMessage = (payload: NewMessagePayload) => {
    const result = onNewMessageSend?.(payload);
    if (result instanceof Promise) {
      return result.then((confirmed) => {
        if (confirmed !== false) setNewMessageOpen(false);
        return confirmed;
      });
    }
    if (result !== false) setNewMessageOpen(false);
    return result;
  };

  const handleCreateGroup = (payload: CreateGroupPayload) => {
    const result = onCreateGroup?.(payload);
    if (result instanceof Promise) {
      return result.then((confirmed) => {
        if (confirmed !== false) setCreateGroupOpen(false);
        return confirmed;
      });
    }
    if (result !== false) setCreateGroupOpen(false);
    return result;
  };

  const handleDeleteConversation = (conversationToDelete: MessagingConversation) => {
    onConversationDelete?.(conversationToDelete);
  };

  const getBusinessReferenceIcon = (reference: MessagingBusinessReference) => {
    if (reference.kind === 'event') return <CalendarDays className="size-4 shrink-0" strokeWidth={1.8} />;
    if (reference.kind === 'task') return <ListTodo className="size-4 shrink-0" strokeWidth={1.8} />;

    return <Briefcase className="size-4 shrink-0" strokeWidth={1.8} />;
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
          onReadVisibleMessages={onReadVisibleMessages ? conversation => void handleReadVisibleMessages(conversation) : undefined}
          readPending={readPending}
        />

        {readFailure && messagingIdsMatch(readFailure.conversationId, resolvedActiveId) && (
          <p role="alert" className="border-b border-[var(--mairie-border)] px-4 py-2 text-sm text-[var(--mairie-error-text)] sm:px-5">{readFailure.message}</p>
        )}

        {unreadNotificationCount > 0 && (
          <div
            role="status"
            aria-label="Notifications de messagerie"
            className="flex flex-wrap items-center gap-3 border-b border-[var(--mairie-border)] bg-[var(--mairie-warning-surface)] px-4 py-2.5 text-sm text-[var(--mairie-warning-text)] sm:px-5"
          >
            <Bell className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="font-semibold">
              {unreadNotificationCount} notification{unreadNotificationCount > 1 ? 's' : ''} non lue
              {unreadNotificationCount > 1 ? 's' : ''}
            </span>
            {firstUnreadConversation && (
              <button
                type="button"
                className="rounded-md px-2 py-1 font-semibold text-[var(--mairie-accent)] transition hover:bg-[var(--mairie-surface)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                onClick={() => handleConversationSelect(firstUnreadConversation)}
              >
                Voir {firstUnreadConversation.name}
              </button>
            )}
          </div>
        )}

        <div ref={messageRegionRef} className="min-h-[340px] flex-1 space-y-5 overflow-y-auto bg-[var(--mairie-surface)] px-4 py-5 sm:px-5">
          {activeConversation ? (
            visibleMessages.length > 0 ? (
              visibleMessages.map((message) => (
                <MessagingMessageBubble
                  onAttachmentDownload={onAttachmentDownload}
                  key={message.id}
                  message={message}
                  data-messaging-message-id={String(message.id)}
                  mentionOptions={displayedMentionOptions}
                  businessReferenceOptions={businessReferences}
                  onBusinessReferenceClick={onBusinessReferenceClick}
                />
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--mairie-muted)]">
                Aucun message dans cette conversation.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--mairie-muted)]">{emptyStateLabel}</div>
          )}
        </div>

        {contextReference && (
          <div
            aria-label="Message contextuel"
            className="flex items-center gap-3 border-t border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-4 py-3 text-sm text-[var(--mairie-teal-text)] sm:px-5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--mairie-surface)] text-[var(--mairie-teal-text)]">
              {getBusinessReferenceIcon(contextReference)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-5">Message contextuel</span>
              <span className="block truncate leading-5">
                {getBusinessReferenceLabel(contextReference)} : {contextReference.title}
              </span>
            </span>
            {onBusinessReferenceClick && (
              <button
                type="button"
                className="shrink-0 rounded-md px-2.5 py-1.5 font-semibold text-[var(--mairie-accent)] transition hover:bg-[var(--mairie-surface)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                onClick={() => onBusinessReferenceClick(contextReference)}
              >
                Ouvrir
              </button>
            )}
          </div>
        )}

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
