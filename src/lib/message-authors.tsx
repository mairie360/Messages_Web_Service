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
/** `person`: the user a `@` tag names, whose card the tag opens. */
type Tag = { kind: MentionKind; href?: string; person?: { id: MessagingContactId; name: string } };
/** A mention that names a person (a contact, or a member the BFF resolved), not a group nor « everyone ». */
type TextMention = { id?: MessagingContactId; name?: string; kind?: string; target?: string };
const isPerson = (mention: TextMention) =>
  mention.id !== undefined && mention.kind !== "group" && mention.target !== "group" && mention.target !== "everyone";
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
  mentions: TextMention[],
  references: Array<{ title?: string; href?: string }>,
  everyone = false,
): React.ReactNode {
  if (typeof content !== "string") return content;

  const kinds = new Map<string, Tag>();
  for (const mention of mentions) {
    const label = `@${mention.name ?? ""}`;
    if (!mention.name?.trim() || !content.includes(label)) continue;
    // A person mention wins over a group of the same name, so the tag opens the person's card.
    if (isPerson(mention)) kinds.set(label, { kind: "user", person: { id: mention.id!, name: mention.name } });
    else if (!kinds.get(label)?.person) kinds.set(label, { kind: "user" });
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
      // A tag with a page is a lib Link that opens it; a person tag is a button that opens the person's card
      // (the thread listens to `data-mention-person`); the others stay emphasised, without the underline of a link.
      if (tag.href) return <Link key={`${part}-${index}`} href={tag.href} size="s" weight="semibold" data-mention-kind={tag.kind}>{part}</Link>;
      if (tag.person) {
        return (
          <button
            key={`${part}-${index}`}
            type="button"
            className="inline cursor-pointer rounded-sm p-0 font-bold text-[var(--mairie-accent)] underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)]"
            data-mention-kind={tag.kind}
            data-mention-person={String(tag.person.id)}
            data-mention-name={tag.person.name}
            aria-label={`Ouvrir la fiche de ${tag.person.name}`}
          >
            {part}
          </button>
        );
      }
      return (
        <strong key={`${part}-${index}`} className="font-bold text-[var(--mairie-accent)]" data-mention-kind={tag.kind}>
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
    // A link whose `#title` is not in the text (the project a message was written about) shows as a chip.
    const linkChips: MessagingBusinessReference[] = (message.links ?? [])
      .filter((link) => link.title && !(typeof message.content === "string" && message.content.includes(`#${link.title}`)) &&
        !(message.businessLinks ?? []).some((reference) => String(reference.id) === String(link.id)))
      .map((link) => ({ id: String(link.id), kind: link.kind, title: link.title!, ...(link.url ? { href: link.url } : {}) }));
    const businessLinks = linkChips.length ? [...(message.businessLinks ?? []), ...linkChips] : message.businessLinks;
    const references = [message.context, ...(businessLinks ?? [])]
      .filter((reference): reference is MessagingBusinessReference => !!reference);

    return {
      ...message,
      ...(businessLinks ? { businessLinks } : {}),
      // MAIR-1167: the raw text stays available (reply excerpt, edit box) once `content` is rendered.
      ...(typeof message.content === "string" ? { text: message.content } : {}),
      content: (
        <>
          <span className="mb-1 block break-words text-xs font-semibold" data-message-author={message.authorId}>
            {authorName}{outgoing ? " (vous)" : ""}
          </span>
          <span className="whitespace-pre-wrap break-words">
            {renderMentionedContent(
              message.content,
              [...mentionOptions, ...(message.mentions ?? []), ...(message.groupMentions ?? []).map((group) => ({ ...group, kind: "group" }))],
              [...businessReferences, ...references, ...(message.links ?? []).map((link) => ({ title: link.title, href: link.url }))],
              message.mentionsEveryone === true,
            )}
          </span>
        </>
      ),
    };
  });
}
