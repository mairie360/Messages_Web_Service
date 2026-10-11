'use client';

import { Messaging } from "@mairie360/lib-components";
import { toMessagingUserId } from "@/lib/messaging-state";
import { AppShell } from "./app-shell";
import { prepareMessagingScrollRegions } from "./messaging-scroll-regions";
import type { useMessagingController } from "./use-messaging-controller";

function MobileConversationSwitch({
  showConversationList,
  onToggle,
}: {
  showConversationList: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="messages-pane-switch"
      aria-pressed={showConversationList}
      onClick={onToggle}
    >
      {showConversationList ? "Retour à la conversation" : "Voir les conversations"}
    </button>
  );
}

type MessagesWorkspaceProps = ReturnType<typeof useMessagingController>;

export function MessagesWorkspace({
  loading,
  currentUser,
  bootstrapError,
  retryBootstrap,
  deletingConversation,
  error,
  syncError,
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
    <AppShell activeItem="messages">
      <div className="messages-module-stack">
        {loading || !currentUser ? (
          <section
            aria-labelledby="messages-bootstrap-title"
            aria-busy={loading}
            className="min-h-0 overflow-y-auto rounded-lg bg-white p-6 shadow-sm"
          >
            <h1 id="messages-bootstrap-title" className="text-xl font-semibold">
              {loading ? "Chargement de la messagerie" : "Messagerie indisponible"}
            </h1>
            {bootstrapError ? (
              <p role="alert" className="messages-error">{bootstrapError}</p>
            ) : null}
            <p role="status" className="my-4">
              {loading
                ? "Les conversations sont en cours de chargement."
                : "Les conversations n’ont pas pu être chargées. Vous pouvez réessayer."}
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={retryBootstrap}
              className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Chargement en cours…" : "Réessayer"}
            </button>
          </section>
        ) : (
          <>
            {deletingConversation && (
              <p role="status" className="messages-operation-status">
                Suppression de la conversation en cours…
              </p>
            )}
            {error && (
              <p role="alert" className="messages-error">
                {error}
              </p>
            )}
            {syncError && (
              <p role="alert" className="messages-error">
                {syncError}
              </p>
            )}
            {selectionPending && (
              <p role="status" className="messages-operation-status">{threadPlaceholder}</p>
            )}

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
                conversations={displayedConversations}
                contacts={contacts}
                messages={displayedMessages}
                mentionOptions={mentionOptions}
                businessReferences={businessReferences}
                activeConversationId={hasConfirmedThread ? activeConversationId : ""}
                currentUserId={toMessagingUserId(currentUser?.id)}
                emptyStateLabel={activeConversationId === "" || hasConfirmedThread ? "Aucune conversation" : threadPlaceholder}
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
