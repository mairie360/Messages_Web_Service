'use client';

import { Messaging } from './components/Messaging';
import { ToastProvider } from "@mairie360/lib-components/primitives";
import { toMessagingUserId } from '@/lib/messaging-state';
import { AppShell, totalUnread } from './components/AppShell';
import { prepareMessagingScrollRegions } from './messaging-scroll-regions';
import { MobileConversationSwitch } from './components/MobileConversationSwitch';
import { MessagesBootstrapState } from './components/MessagesBootstrapState';
import { MessagesNotices } from './components/MessagesNotices';
import { MessagesReceptionDelayed } from './components/MessagesReceptionDelayed';
import { FeedbackToast } from './components/FeedbackToast';
import type { useMessagingController } from '../../use-messaging-controller';

type MessagesWorkspaceProps = ReturnType<typeof useMessagingController>;

export function MessagesWorkspace({
  loading,
  currentUser,
  bootstrapError,
  retryBootstrap,
  deletingConversation,
  error,
  dismissError,
  feedback,
  dismissFeedback,
  syncError,
  streamState,
  retryReception,
  selectionPending,
  threadPlaceholder,
  activeConversationId,
  showConversationList,
  displayedConversations,
  contacts,
  displayedMessages,
  mentionOptions,
  businessReferences,
  hasConfirmedThread,
  loadConversationMessages,
  loadContacts,
  handleSendMessage,
  hasConfirmedMessages,
  handleReadVisibleMessages,
  handleAttach,
  handleAttachmentDownload,
  handleNewMessageSend,
  handleCreateGroup,
  handleConversationDelete,
  handleSearch,
  handleSuggestMentions,
  handleSuggestLinks,
  handleEditMessage,
  handleDeleteMessage,
  handleToggleReaction,
  handleLoadMembers,
  handleAddMembers,
  handleRemoveMember,
  handleLeaveConversation,
  toggleConversationList,
}: MessagesWorkspaceProps) {
  return (
    <ToastProvider regionLabel="Notifications de la messagerie" placement="bottom-end">
    <AppShell activeItem="messages" unreadCount={currentUser ? totalUnread(displayedConversations) : 0}>
      <div className="messages-module-stack">
        {loading || !currentUser ? (
          <MessagesBootstrapState loading={loading} error={bootstrapError} onRetry={retryBootstrap} />
        ) : (
          <>
            <MessagesReceptionDelayed state={streamState} onRetry={retryReception} />
            <MessagesNotices
              deletingConversation={deletingConversation}
              error={error}
              onDismissError={dismissError}
              syncError={syncError}
              pendingText={selectionPending ? threadPlaceholder : null}
            />

            {activeConversationId && (
              <MobileConversationSwitch
                showConversationList={showConversationList}
                onToggle={toggleConversationList}
              />
            )}
            <div
              className={`messages-module-frame${showConversationList ? " messages-list-open" : ""}`}
              ref={prepareMessagingScrollRegions}
            >
              <Messaging
                key={String(currentUser.id)}
                conversations={displayedConversations}
                contacts={contacts}
                messages={displayedMessages}
                mentionOptions={mentionOptions}
                businessReferences={businessReferences}
                activeConversationId={hasConfirmedThread ? activeConversationId : ""}
                currentUserId={toMessagingUserId(currentUser?.id)}
                // MAIR-1171: the thread picks its own empty state (no conversation / no selection); only the
                // loading text of a thread being opened is passed.
                emptyStateLabel={activeConversationId === "" || hasConfirmedThread ? undefined : threadPlaceholder}
                aria-busy={selectionPending}
                onConversationSelect={(conversation) =>
                  void loadConversationMessages(conversation.id)
                }
                onNewMessageClick={() => void loadContacts()}
                onCreateGroupClick={() => void loadContacts()}
                onSendMessage={hasConfirmedThread ? handleSendMessage : undefined}
                onReadVisibleMessages={hasConfirmedThread && hasConfirmedMessages && !selectionPending ? handleReadVisibleMessages : undefined}
                onAttachmentDownload={handleAttachmentDownload}
                onAttach={handleAttach}
                onNewMessageSend={handleNewMessageSend}
                onCreateGroup={handleCreateGroup}
                onConversationDelete={deletingConversation || !hasConfirmedThread ? undefined : handleConversationDelete}
                onSearch={hasConfirmedThread ? handleSearch : undefined}
                onSuggestMentions={handleSuggestMentions}
                onSuggestLinks={handleSuggestLinks}
                onEditMessage={hasConfirmedThread ? handleEditMessage : undefined}
                onDeleteMessage={hasConfirmedThread ? handleDeleteMessage : undefined}
                onToggleReaction={hasConfirmedThread ? handleToggleReaction : undefined}
                onLoadMembers={hasConfirmedThread ? handleLoadMembers : undefined}
                onAddMembers={handleAddMembers}
                onRemoveMember={handleRemoveMember}
                onLeaveConversation={handleLeaveConversation}
                className="messages-module"
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
    <FeedbackToast feedback={feedback} dismissFeedback={dismissFeedback} />
    </ToastProvider>
  );
}
