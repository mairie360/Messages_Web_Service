'use client';

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import {
  messageClient,
  type ContactDto,
  type CurrentUserDto,
  type MessageId,
} from "@/clients/messageClient";
import { AppShell } from "./_components/app-shell";

type MessagingProps = ComponentProps<typeof Messaging>;
type MessagingConversation = NonNullable<MessagingProps["conversations"]>[number];
type MessagingMessage = NonNullable<MessagingProps["messages"]>[number];
type MessagingContactId = MessagingConversation["id"];
type SendMessagePayload = Parameters<NonNullable<MessagingProps["onSendMessage"]>>[0];
type NewMessagePayload = Parameters<NonNullable<MessagingProps["onNewMessageSend"]>>[0];
type CreateGroupPayload = Parameters<NonNullable<MessagingProps["onCreateGroup"]>>[0];

const loadingUser = {
  name: "Chargement...",
  role: "Guest",
};

function idsMatch(left: MessageId | undefined, right: MessageId | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function upsertConversation(
  conversations: MessagingConversation[],
  nextConversation?: MessagingConversation,
) {
  if (!nextConversation) return conversations;

  const conversationExists = conversations.some((conversation) =>
    idsMatch(conversation.id, nextConversation.id),
  );

  if (!conversationExists) {
    return [nextConversation, ...conversations];
  }

  return conversations.map((conversation) =>
    idsMatch(conversation.id, nextConversation.id)
      ? { ...conversation, ...nextConversation }
      : conversation,
  );
}

function replaceConversationMessages(
  currentMessages: MessagingMessage[],
  conversationId: MessageId,
  nextMessages: MessagingMessage[],
) {
  return [
    ...currentMessages.filter(
      (message) => !idsMatch(message.conversationId, conversationId),
    ),
    ...nextMessages,
  ];
}

function appendMessage(
  currentMessages: MessagingMessage[],
  nextMessage?: MessagingMessage,
) {
  if (!nextMessage) return currentMessages;

  if (currentMessages.some((message) => idsMatch(message.id, nextMessage.id))) {
    return currentMessages.map((message) =>
      idsMatch(message.id, nextMessage.id) ? nextMessage : message,
    );
  }

  return [...currentMessages, nextMessage];
}

function getPayloadIds(items?: Array<{ id: MessageId }>) {
  return items?.map((item) => item.id);
}

export default function Page() {
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
  const [activeConversationId, setActiveConversationId] =
    useState<MessagingContactId>("");
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shellUser = useMemo(
    () =>
      currentUser
        ? {
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            avatarUrl: currentUser.avatarUrl,
            phone: currentUser.phone,
            service: currentUser.service,
            position: currentUser.position,
            address: currentUser.address,
            city: currentUser.city,
            lastConnection: currentUser.lastConnection,
          }
        : loadingUser,
    [currentUser],
  );

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
        setContacts(bootstrap.contacts ?? []);
        setConversations(bootstrap.conversations);
        setMessages(bootstrap.messages);
        setActiveConversationId(
          bootstrap.activeConversationId ?? firstConversationId,
        );

        // Load contacts independently so the recipient menu does not depend
        // on the modal opening timing or on the conversation list.
        try {
          const contactsResponse = await messageClient.getContacts();
          if (isMounted) setContacts(contactsResponse.contacts ?? []);
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

  const loadContacts = async () => {
    try {
      const response = await messageClient.getContacts();
      setContacts(response.contacts);
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

      if (response.messages) {
        setMessages((currentMessages) =>
          replaceConversationMessages(
            currentMessages,
            payload.conversationId as MessageId,
            response.messages ?? [],
          ),
        );
        return;
      }

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

    try {
      const response = await messageClient.createDirectMessage(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
      setActiveConversationId(response.conversation.id);
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
    <AppShell activeItem="messages" user={shellUser} isAdmin>
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
          activeConversationId={activeConversationId}
          currentUserId={currentUser?.id}
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
