import React, { type ComponentProps } from "react";
import { Link } from "@mairie360/lib-components/primitives";
import type { Messaging } from '../components/MessagesPage/components/MessagesWorkspace/components/Messaging';
import type {
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMessage,
} from "./messaging-state";

type Mention = NonNullable<ComponentProps<typeof Messaging>["mentionOptions"]>[number];
type MentionKind = "user" | "business";
type Tag = { kind: MentionKind; href?: string };
/** MAIR-1166: label of the « everyone » tag in the text (same as the composer). */
const EVERYONE_TAG = "@tout le monde";

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
  mentions: Array<{ name?: string }>,
  references: Array<{ title?: string; href?: string }>,
  everyone = false,
): React.ReactNode {
  if (typeof content !== "string") return content;

  const kinds = new Map<string, Tag>();
  for (const mention of mentions) {
    const label = `@${mention.name ?? ""}`;
    if (mention.name?.trim() && content.includes(label)) kinds.set(label, { kind: "user" });
  }
  if (everyone && content.includes(EVERYONE_TAG)) kinds.set(EVERYONE_TAG, { kind: "user" });
  for (const reference of references) {
    const label = `#${reference.title ?? ""}`;
    // A link of the message (with its page) wins over a suggestion of the same title.
    if (reference.title?.trim() && content.includes(label) && !kinds.get(label)?.href) kinds.set(label, { kind: "business", href: reference.href });
  }

  if (kinds.size === 0) return content;

  const pattern = [...kinds.keys()].sort((left, right) => right.length - left.length)
    .map(escapeRegExp).join("|");
  return content.split(new RegExp(`(${pattern})(?![\\p{L}\\p{N}_])`, "gu"))
    .map((part, index) => {
      const tag = kinds.get(part);
      if (!tag) return part;
      // MAIR-1166: a tag with a page is a lib Link that opens it; the others stay emphasised in the accent colour.
      return tag.href ? (
        <Link key={`${part}-${index}`} href={tag.href} size="s" weight="semibold" data-mention-kind={tag.kind}>{part}</Link>
      ) : (
        <strong key={`${part}-${index}`} className="font-bold text-[var(--mairie-accent)] underline underline-offset-2" data-mention-kind={tag.kind}>
          {part}
        </strong>
      );
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
              [...mentionOptions, ...(message.mentions ?? []), ...(message.groupMentions ?? [])],
              [...businessReferences, ...references, ...(message.links ?? []).map((link) => ({ title: link.title, href: link.url }))],
              message.mentionsEveryone === true,
            )}
          </span>
        </>
      ),
    };
  });
}
