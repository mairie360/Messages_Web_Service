'use client';

import { Messaging } from './components/Messaging';
import { DataState, Toast } from "@mairie360/lib-components/primitives";
import { toMessagingUserId } from '@/lib/messaging-state';
import { AppShell, totalUnread } from './components/AppShell';
import { prepareMessagingScrollRegions } from './messaging-scroll-regions';
import { MobileConversationSwitch } from './components/MobileConversationSwitch';
import { MessagesBootstrapState } from './components/MessagesBootstrapState';
import { MessagesNotices } from './components/MessagesNotices';
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
  toggleConversationList,
}: MessagesWorkspaceProps) {
  return (
    <AppShell activeItem="messages" unreadCount={currentUser ? totalUnread(displayedConversations) : 0}>
      <div className="messages-module-stack">
        {loading || !currentUser ? (
          <MessagesBootstrapState loading={loading} error={bootstrapError} onRetry={retryBootstrap} />
        ) : (
          <>
            <h1 className="sr-only">Messagerie</h1>
            {feedback && <Toast variant="success" message={feedback} onClose={dismissFeedback} />}
            <div className="messages-reception-status" role="status" aria-live="polite">
              {streamState === 'connected' ? 'Réception automatique active.' : streamState === 'polling' ? 'Actualisation automatique active.' : streamState === 'connecting' ? 'Connexion à la réception automatique…' : 'Réception automatique retardée.'}
              {streamState === 'offline' && <button type="button" onClick={retryReception} className="ml-3 min-h-11 font-semibold underline">Réessayer la réception</button>}
            </div>
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
                emptyStateLabel={activeConversationId === ""
                  ? <DataState state="empty" title="Aucune conversation" description="Créez un message ou un groupe pour commencer." />
                  : hasConfirmedThread ? "Aucune conversation" : threadPlaceholder}
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
                className="messages-module"
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
