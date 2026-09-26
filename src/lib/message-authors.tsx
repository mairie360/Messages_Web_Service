import React, { type ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import type {
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMessage,
} from "./messaging-state";

type Mention = NonNullable<ComponentProps<typeof Messaging>["mentionOptions"]>[number];
type MentionKind = "user" | "business";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildMessageMentionOptions(
  contacts: MessagingConversation[],
  conversations: MessagingConversation[],
): Mention[] {
  const seen = new Set<string>();

  return [
    ...contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      kind: "direct" as const,
      description: contact.department,
    })),
    ...conversations.filter((conversation) => conversation.kind === "group").map((conversation) => ({
      id: conversation.id,
      name: conversation.name,
      kind: "group" as const,
      description: conversation.department,
    })),
  ].filter((mention) => {
    const key = `${mention.kind}:${String(mention.id)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The shared bubble parses mentions only when content is a string. Keep that
// presentation when an author label makes the display content a React node.
function renderMentionedContent(
  content: React.ReactNode,
  mentions: Mention[],
  references: MessagingBusinessReference[],
): React.ReactNode {
  if (typeof content !== "string") return content;

  const kinds = new Map<string, MentionKind>();
  for (const mention of mentions) {
    const label = `@${mention.name}`;
    if (mention.name.trim() && content.includes(label)) kinds.set(label, "user");
  }
  for (const reference of references) {
    const label = `#${reference.title}`;
    if (reference.title.trim() && content.includes(label)) kinds.set(label, "business");
  }

  if (kinds.size === 0) return content;

  const pattern = [...kinds.keys()].sort((left, right) => right.length - left.length)
    .map(escapeRegExp).join("|");
  return content.split(new RegExp(`(${pattern})(?![\\p{L}\\p{N}_])`, "gu"))
    .map((part, index) => {
      const kind = kinds.get(part);
      return kind ? (
        <strong key={`${part}-${index}`} className="font-bold underline underline-offset-2" data-mention-kind={kind}>
          {part}
        </strong>
      ) : part;
    });
}

export function presentMessageAuthors(
  messages: MessagingMessage[],
  currentUserId: MessagingContactId | undefined,
  mentionOptions: Mention[],
  businessReferences: MessagingBusinessReference[],
): MessagingMessage[] {
  return messages.map((message) => {
    const authorName = message.authorName?.trim();
    if (!authorName) return message;

    const outgoing = currentUserId !== undefined && message.authorId !== undefined
      ? String(message.authorId) === String(currentUserId)
      : message.direction === "outgoing";
    const references = [message.context, ...(message.businessLinks ?? [])]
      .filter((reference): reference is MessagingBusinessReference => !!reference);

    return {
      ...message,
      content: (
        <>
          <span className="mb-1 block break-words text-xs font-semibold" data-message-author={message.authorId}>
            {authorName}{outgoing ? " (vous)" : ""}
          </span>
          <span className="whitespace-pre-wrap break-words">
            {renderMentionedContent(
              message.content,
              [...mentionOptions, ...(message.mentions ?? [])],
              [...businessReferences, ...references],
            )}
          </span>
        </>
      ),
    };
  });
}
