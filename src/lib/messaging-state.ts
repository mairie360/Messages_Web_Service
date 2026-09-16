import type { ComponentProps } from "react";
import type { Messaging } from "@mairie360/lib-components";
import type { ContactDto, MessageId } from "../clients/messageClient";

// Mise à jour de l'état de la page de messagerie à partir des réponses du BFF (DTO du contrat)
// vers les props du composant partagé `Messaging`.

type MessagingProps = ComponentProps<typeof Messaging>;
export type MessagingConversation = NonNullable<MessagingProps["conversations"]>[number];
export type MessagingMessage = NonNullable<MessagingProps["messages"]>[number];
export type MessagingBusinessReference = NonNullable<MessagingProps["businessReferences"]>[number];
export type MessagingContactId = MessagingConversation["id"];

export function idsMatch(left: MessageId | undefined, right: MessageId | undefined) {
  return String(left ?? "") === String(right ?? "");
}

export function isPlaceholderConversationName(name: string) {
  return /^Conversation\s+\d+$/i.test(name.trim());
}

export function toMessagingUserId(id: MessageId | undefined) {
  if (id === undefined) return undefined;

  const value = String(id);
  return value.startsWith("user-") ? value : `user-${value}`;
}

export function upsertConversation(
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
      ? {
          ...conversation,
          ...nextConversation,
          name:
            isPlaceholderConversationName(nextConversation.name) &&
            !isPlaceholderConversationName(conversation.name)
              ? conversation.name
              : nextConversation.name,
        }
      : conversation,
  );
}

export function replaceConversationMessages(
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

export function appendMessage(
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

export function getPayloadIds(items?: Array<{ id: MessageId }>) {
  return items?.map((item) => item.id);
}

export function toMessagingContacts(
  contacts: ContactDto[] | undefined,
): MessagingConversation[] {
  return (contacts ?? []).map((contact) => ({
    id: contact.id,
    name: contact.name,
    department: contact.department,
    kind: "direct",
    avatarUrl: contact.avatarUrl,
    initials: contact.initials,
    presence: contact.presence,
  }));
}
