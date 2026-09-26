'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import { BffRequestError, messageClient, type CurrentUserDto } from "@/clients/messageClient";
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
import { prepareMessagingScrollRegions } from "./_components/messaging-scroll-regions";
import { presentConversationTimestamps, presentMessageTimestamps } from "@/lib/message-timestamps";

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

  // Keep BFF state intact; only the shared component receives display labels.
  const displayedConversations = useMemo(() => presentConversationTimestamps(conversations), [conversations]);
  const displayedMessages = useMemo(() => presentMessageTimestamps(messages), [messages]);

  useEffect(() => {
    let isMounted = true;

    async function loadBootstrap() {
      setLoading(true);
      setError(null);

      try {
        const bootstrap = await messageClient.getBootstrap();

        if (!isMounted) return;

        const firstConversationId = bootstrap.conversations[0]?.id ?? "";
        const requestedConversationId = new URLSearchParams(window.location.search).get("conversation")?.trim();
        let selectedId = bootstrap.activeConversationId ?? firstConversationId;
        let initialConversations: MessagingConversation[] = bootstrap.conversations;
        let initialMessages: MessagingMessage[] = bootstrap.messages;

        if (requestedConversationId) {
          try {
            // The BFF decides whether this user may access the requested thread.
            const thread = await messageClient.getConversationMessages(requestedConversationId);
            if (!isMounted) return;
            if (!idsMatch(thread.conversation.id, requestedConversationId)) {
              throw new Error("La conversation demandée est indisponible.");
            }
            selectedId = thread.conversation.id;
            initialConversations = upsertConversation(initialConversations, thread.conversation);
            initialMessages = replaceConversationMessages(initialMessages, selectedId, thread.messages);
          } catch {
            if (!isMounted) return;
            setError("La conversation demandée est introuvable ou inaccessible.");
          }
        }

        setCurrentUser(bootstrap.currentUser);
        setContacts(toMessagingContacts(bootstrap.contacts));
        setConversations(initialConversations);
        setMessages(initialMessages);
        activeConversationRef.current = selectedId;
        setActiveConversationId(selectedId);

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

    void loadBootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    async function loadBusinessReferences() {
      if (disposed || inFlight || !pageIsVisible()) return;
      inFlight = true;
      try {
        const response = await messageClient.getBusinessReferences();

        if (!disposed) setBusinessReferences(response.references ?? []);
      } catch (loadError) {
        // Keep suggestions through transient failures, but not an explicit access refusal.
        if (!disposed && loadError instanceof BffRequestError &&
            (loadError.status === 401 || loadError.status === 403)) {
          setBusinessReferences([]);
        }
      } finally {
        inFlight = false;
      }
    }

    const refreshReferences = () => { void loadBusinessReferences(); };
    refreshReferences();
    window.addEventListener("focus", refreshReferences);
    document.addEventListener("visibilitychange", refreshReferences);

    return () => {
      disposed = true;
      window.removeEventListener("focus", refreshReferences);
      document.removeEventListener("visibilitychange", refreshReferences);
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
    <AppShell activeItem="messages" boundedContent>
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

        <div className="messages-module-frame" ref={prepareMessagingScrollRegions}>
          <Messaging
            conversations={displayedConversations}
            contacts={contacts}
            messages={displayedMessages}
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
          />
        </div>
      </div>
    </AppShell>
  );
}
