import type { ComponentProps } from "react";
import type { Messaging } from '../components/MessagesPage/components/MessagesWorkspace/components/Messaging';
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

// The BFF_Message contract gives direct conversations `kind: 'direct'` and the contact's `contactId`
// (MAIR-204); the shared `Messaging` conversation type does not declare `contactId`.
type ConversationWithContact = MessagingConversation & { contactId?: MessageId };

// The existing direct conversation with `recipientId`, if any: a new message to that contact is
// posted there instead of creating another chat. Ids are compared in the `user-<n>` form.
export function findDirectConversation(
  conversations: MessagingConversation[],
  recipientId: MessageId,
): MessagingConversation | undefined {
  const recipient = toMessagingUserId(recipientId);
  return conversations.find((conversation) => {
    const { kind, contactId } = conversation as ConversationWithContact;
    return kind === "direct" && contactId !== undefined && toMessagingUserId(contactId) === recipient;
  });
}

export function getPayloadIds(items?: Array<{ id: MessageId }>) {
  return items?.map((item) => item.id);
}

// Same rule as BFF_Message `inputId('user')`: a positive integer or a `user-<n>` public id.
const USER_ID = /^(?:user-)?[1-9]\d*$/;

export function isUserId(id: MessageId) {
  return USER_ID.test(String(id));
}

/**
 * Ids sent as `mentionIds`: users only. The composer also offers group conversations (`conversation-<n>`) as
 * mention options; they stay highlighted in the text but are not transmitted, the BFF would refuse them (MAIR-512).
 */
export function toMentionIds(mentions?: Array<{ id: MessageId }>): MessageId[] {
  return (getPayloadIds(mentions) ?? []).filter(isUserId);
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

// MAIR-1166: same rules as BFF_Message for the group and link ids of a message.
const GROUP_ID = /^(?:group-)?[1-9]\d*$/;
const LINK_ID = /^(?:project|task|event)-\d{1,9}$/;

type TagMention = { id: MessageId; target?: "person" | "group" | "everyone" };

/**
 * MAIR-1166: the tags of a draft as the BFF takes them: members (`mentionIds`), everyone (`mentionEveryone`), groups
 * and services (`groupMentionIds`) and the projects, tasks and events it links (`links`). Anything else (a local
 * group conversation, a reference the BFF cannot link) stays in the text without being sent.
 */
export function toTagPayload(mentions: TagMention[] = [], businessLinks: Array<{ id: MessageId }> = []) {
  const groupMentionIds = mentions.filter((mention) => mention.target === "group" && GROUP_ID.test(String(mention.id))).map((mention) => mention.id);
  const links = businessLinks.filter((link) => LINK_ID.test(String(link.id))).map((link) => ({ id: String(link.id) }));
  // Only `mentionIds` is always sent; the other tags only when the draft has some.
  return {
    mentionIds: toMentionIds(mentions.filter((mention) => mention.target !== "group" && mention.target !== "everyone")),
    ...(mentions.some((mention) => mention.target === "everyone") ? { mentionEveryone: true } : {}),
    ...(groupMentionIds.length ? { groupMentionIds } : {}),
    ...(links.length ? { links } : {}),
  };
}

type LinkSuggestion = { id: string; kind: "project" | "task" | "event"; title: string; detail?: string; url?: string };

/** MAIR-1166: a `#` suggestion of the BFF as a business reference of the composer (its page in `href`). */
export function toLinkReference(item: LinkSuggestion): MessagingBusinessReference {
  return { id: item.id, kind: item.kind, title: item.title, ...(item.detail ? { description: item.detail } : {}), ...(item.url ? { href: item.url } : {}) };
}

/**
 * MAIR-1168: the tags of an edited message, every field sent so that a tag removed from the text is removed from
 * the message too.
 */
export function toEditTagPayload(mentions: TagMention[] = [], businessLinks: Array<{ id: MessageId }> = []) {
  const tags = toTagPayload(mentions, businessLinks);
  return { mentionIds: tags.mentionIds, mentionEveryone: tags.mentionEveryone === true, groupMentionIds: tags.groupMentionIds ?? [], links: tags.links ?? [] };
}
