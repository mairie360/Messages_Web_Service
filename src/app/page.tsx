'use client';

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import { messageClient, type CurrentUserDto } from "@/clients/messageClient";
import {
  appendMessage,
  findDirectConversation,
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
    setActiveConversationId(conversationId);
    setError(null);

    try {
      const response = await messageClient.getConversationMessages(conversationId);

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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Les messages de cette conversation sont indisponibles.",
      );
    }
  };

  const handleSendMessage = async (payload: SendMessagePayload) => {
    if (!payload.conversationId || payload.content.trim().length === 0) {
      return;
    }

    setError(null);

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
    }
  };

  const handleNewMessageSend = async (payload: NewMessagePayload) => {
    if (payload.message.trim().length === 0) {
      return;
    }

    setError(null);

    // Post into the existing direct conversation with this contact, if any; otherwise the BFF
    // creates the chat.
    const existingConversation = findDirectConversation(conversations, payload.recipientId);

    try {
      const response = existingConversation
        ? await messageClient.sendMessage(existingConversation.id, {
            content: payload.message,
            attachmentIds: [],
            mentionIds: [],
          })
        : await messageClient.createDirectMessage(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
      const conversationId = response.conversation?.id ?? existingConversation?.id;
      if (conversationId !== undefined) setActiveConversationId(conversationId);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Le message direct n'a pas pu être créé.",
      );
    }
  };

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    setError(null);

    try {
      const response = await messageClient.createGroup(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setActiveConversationId(response.conversation.id);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Le groupe n'a pas pu être créé.",
      );
    }
  };

  const handleConversationDelete: NonNullable<MessagingProps["onConversationDelete"]> =
    async (conversationToDelete) => {
      setError(null);

      try {
        await messageClient.deleteConversation(conversationToDelete.id);

        setConversations((currentConversations) => {
          const remainingConversations = currentConversations.filter(
            (conversation) => !idsMatch(conversation.id, conversationToDelete.id),
          );

          if (idsMatch(activeConversationId, conversationToDelete.id)) {
            setActiveConversationId(remainingConversations[0]?.id ?? "");
          }

          return remainingConversations;
        });
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
