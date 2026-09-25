'use client';

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import { messageClient, type CurrentUserDto } from "@/clients/messageClient";
import {
  appendMessage,
  getPayloadIds,
  idsMatch,
  replaceConversationMessages,
  toMessagingContacts,
  toMessagingUserId,
  upsertConversation,
  type MessagingBusinessReference,
  type MessagingContactId,
  type MessagingConversation,
  type MessagingMessage,
} from "@/lib/messaging-state";
import { AppShell } from "./_components/app-shell";

type MessagingProps = ComponentProps<typeof Messaging>;
type SendMessagePayload = Parameters<NonNullable<MessagingProps["onSendMessage"]>>[0];
type NewMessagePayload = Parameters<NonNullable<MessagingProps["onNewMessageSend"]>>[0];
type CreateGroupPayload = Parameters<NonNullable<MessagingProps["onCreateGroup"]>>[0];

const MESSAGE_REFRESH_INTERVAL_MS = 10_000;
const pageIsVisible = () => typeof document === "undefined" || !document.hidden;

export default function Page() {
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
  const [activeConversationId, setActiveConversationId] =
    useState<MessagingContactId>("");
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [contacts, setContacts] = useState<MessagingConversation[]>([]);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [businessReferences, setBusinessReferences] =
    useState<MessagingBusinessReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const activeConversationRef = useRef<MessagingContactId>("");
  const revisionRef = useRef(0);
  const mutationCountRef = useRef(0);
  const selectionLoadingRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBootstrap() {
      setLoading(true);
      setError(null);

      try {
        const bootstrap = await messageClient.getBootstrap();

        if (!isMounted) return;

        const firstConversationId = bootstrap.conversations[0]?.id ?? "";
        setCurrentUser(bootstrap.currentUser);
        setContacts(toMessagingContacts(bootstrap.contacts));
        setConversations(bootstrap.conversations);
        setMessages(bootstrap.messages);
        activeConversationRef.current = bootstrap.activeConversationId ?? firstConversationId;
        setActiveConversationId(
          bootstrap.activeConversationId ?? firstConversationId,
        );

        // Load contacts independently so the recipient menu does not depend
        // on the modal opening timing or on the conversation list.
        try {
          const contactsResponse = await messageClient.getContacts();
          if (isMounted) {
            setContacts(toMessagingContacts(contactsResponse.contacts));
          }
        } catch {
          // Bootstrap contacts remain available as a fallback.
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "La messagerie est indisponible.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadBusinessReferences() {
      try {
        const response = await messageClient.getBusinessReferences();

        if (isMounted) setBusinessReferences(response.references ?? []);
      } catch {
        if (isMounted) setBusinessReferences([]);
      }
    }

    void loadBootstrap();
    void loadBusinessReferences();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let disposed = false;
    let inFlight = false;

    const refresh = async () => {
      if (disposed || inFlight || !pageIsVisible() || mutationCountRef.current > 0 ||
          selectionLoadingRef.current !== null) return;
      inFlight = true;
      const revision = revisionRef.current;
      const selectedId = activeConversationRef.current;
      try {
        const list = await messageClient.getConversations();
        const selectedExists = selectedId !== "" && list.conversations.some((conversation: MessagingConversation) =>
          idsMatch(conversation.id, selectedId),
        );
        const thread = selectedExists
          ? await messageClient.getConversationMessages(selectedId)
          : null;
        if (disposed || !pageIsVisible() || revisionRef.current !== revision ||
            mutationCountRef.current > 0 || selectionLoadingRef.current !== null ||
            !idsMatch(activeConversationRef.current, selectedId)) return;

        setConversations(list.conversations);
        if (thread) {
          setMessages((current) =>
            replaceConversationMessages(current, selectedId, thread.messages),
          );
        } else if (selectedId !== "" && !selectedExists) {
          const fallbackId = list.conversations[0]?.id ?? "";
          activeConversationRef.current = fallbackId;
          revisionRef.current += 1;
          setActiveConversationId(fallbackId);
          setMessages((current) => current.filter((message) =>
            !idsMatch(message.conversationId, selectedId),
          ));
        }
        if (!disposed) setSyncError(null);
      } catch {
        if (!disposed && revisionRef.current === revision && pageIsVisible()) {
          setSyncError("La synchronisation des conversations est momentanément indisponible.");
        }
      } finally {
        inFlight = false;
      }
    };

    const triggerRefresh = () => { void refresh(); };
    triggerRefresh();
    const timer = window.setInterval(triggerRefresh, MESSAGE_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", triggerRefresh);
    document.addEventListener("visibilitychange", triggerRefresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", triggerRefresh);
      document.removeEventListener("visibilitychange", triggerRefresh);
    };
  }, [currentUser]);

  const beginMutation = () => {
    revisionRef.current += 1;
    mutationCountRef.current += 1;
  };

  const endMutation = () => {
    mutationCountRef.current -= 1;
    revisionRef.current += 1;
  };

  const loadContacts = async () => {
    try {
      const response = await messageClient.getContacts();
      setContacts(toMessagingContacts(response.contacts));
    } catch (contactsError) {
      setError(
        contactsError instanceof Error
          ? contactsError.message
          : "Les contacts sont indisponibles.",
      );
    }
  };

  const loadConversationMessages = async (conversationId: MessagingContactId) => {
    const revision = ++revisionRef.current;
    activeConversationRef.current = conversationId;
    selectionLoadingRef.current = revision;
    setActiveConversationId(conversationId);
    setError(null);

    try {
      const response = await messageClient.getConversationMessages(conversationId);
      if (revisionRef.current !== revision ||
          !idsMatch(activeConversationRef.current, conversationId)) return;

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setMessages((currentMessages) =>
        replaceConversationMessages(
          currentMessages,
          response.conversation.id,
          response.messages,
        ),
      );
    } catch (loadError) {
      if (revisionRef.current === revision) setError(
        loadError instanceof Error
          ? loadError.message
          : "Les messages de cette conversation sont indisponibles.",
      );
    } finally {
      if (selectionLoadingRef.current === revision) selectionLoadingRef.current = null;
    }
  };

  const handleSendMessage = async (payload: SendMessagePayload) => {
    if (!payload.conversationId || payload.content.trim().length === 0) {
      return;
    }

    setError(null);
    beginMutation();

    try {
      const response = await messageClient.sendMessage(payload.conversationId, {
        content: payload.content,
        attachmentIds: getPayloadIds(payload.attachments),
        mentionIds: getPayloadIds(payload.mentions),
      });

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );

      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Le message n'a pas pu être envoyé.",
      );
    } finally {
      endMutation();
    }
  };

  const handleNewMessageSend = async (payload: NewMessagePayload) => {
    if (payload.message.trim().length === 0) {
      return;
    }

    setError(null);
    beginMutation();

    try {
      const response = await messageClient.createDirectMessage(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
      setActiveConversationId(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Le message direct n'a pas pu être créé.",
      );
    } finally {
      endMutation();
    }
  };

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    setError(null);
    beginMutation();

    try {
      const response = await messageClient.createGroup(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setActiveConversationId(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Le groupe n'a pas pu être créé.",
      );
    } finally {
      endMutation();
    }
  };

  const handleConversationDelete: NonNullable<MessagingProps["onConversationDelete"]> =
    async (conversationToDelete) => {
      setError(null);
      beginMutation();

      try {
        await messageClient.deleteConversation(conversationToDelete.id);

        if (idsMatch(activeConversationRef.current, conversationToDelete.id)) {
          const fallbackId = conversations.find((conversation) =>
            !idsMatch(conversation.id, conversationToDelete.id))?.id ?? "";
          activeConversationRef.current = fallbackId;
          setActiveConversationId(fallbackId);
        }
        setConversations((currentConversations) => currentConversations.filter(
          (conversation) => !idsMatch(conversation.id, conversationToDelete.id),
        ));
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) => !idsMatch(message.conversationId, conversationToDelete.id),
          ),
        );
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "La conversation n'a pas pu être supprimée.",
        );
      } finally {
        endMutation();
      }
    };

  return (
    <AppShell activeItem="messages">
      <div className="messages-module-stack">
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

        <Messaging
          conversations={conversations}
          contacts={contacts}
          messages={messages}
          businessReferences={businessReferences}
          activeConversationId={activeConversationId}
          currentUserId={toMessagingUserId(currentUser?.id)}
          emptyStateLabel={
            loading ? "Chargement de la messagerie..." : "Aucune conversation"
          }
          onConversationSelect={(conversation) =>
            void loadConversationMessages(conversation.id)
          }
          onNewMessageClick={() => void loadContacts()}
          onCreateGroupClick={() => void loadContacts()}
          onSendMessage={(payload) => void handleSendMessage(payload)}
          onNewMessageSend={(payload) => void handleNewMessageSend(payload)}
          onCreateGroup={(payload) => void handleCreateGroup(payload)}
          onConversationDelete={handleConversationDelete}
          className="messages-module"
          style={{
            height: "min(692px, calc(100vh - 192px))",
            minHeight: "560px",
          }}
        />
      </div>
    </AppShell>
  );
}
