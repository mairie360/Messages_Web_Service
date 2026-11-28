import type {
  MessagingMember,
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMention,
  MessagingMessage,
  MessagingSendMessagePayload,
  MessagingSendResult,
} from './messaging-types';

/** Line under a conversation's name (list item, thread header): the person's service, or « Groupe · N membres » for a group. */
export const conversationSubtitle = (conversation: MessagingConversation) => {
  if (conversation.kind === 'group') {
    const count = Number.isSafeInteger(conversation.memberCount) && (conversation.memberCount ?? 0) > 0 ? conversation.memberCount! : undefined;
    return count === undefined ? 'Groupe' : `Groupe · ${count} ${count === 1 ? 'membre' : 'membres'}`;
  }
  return conversation.department?.trim() || undefined;
};

/**
 * People who wrote in a loaded thread, first author first, each once: the avatar pile of a group header before its
 * members list is read (the conversation itself only carries the number of members).
 */
export const threadAuthors = (messages: MessagingMessage[]): MessagingMember[] => {
  const seen = new Set<string>();
  return messages.flatMap((message) => {
    const name = message.authorName?.trim();
    if (message.kind === 'system' || message.authorId === undefined || !name || seen.has(String(message.authorId))) return [];
    seen.add(String(message.authorId));
    return [{ id: message.authorId, name, isAdmin: false }];
  });
};

/** Ids come as numbers or strings from the BFF; compare their string form. */
export const messagingIdsMatch = (
  left: MessagingContactId | undefined,
  right: MessagingContactId | undefined
) => left !== undefined && right !== undefined && String(left) === String(right);

/** The author decides the side of a bubble once the current user is known. */
export const getMessageDirection = (message: MessagingMessage, currentUserId?: MessagingContactId) => {
  if (currentUserId !== undefined && message.authorId !== undefined) {
    return messagingIdsMatch(message.authorId, currentUserId) ? 'outgoing' : 'incoming';
  }
  if (message.direction) return message.direction;

  return 'incoming';
};

/** Append streamed messages that the loaded history does not already hold. */
export const mergeMessagesById = (baseMessages: MessagingMessage[], nextMessages: MessagingMessage[] = []) => {
  const messageIds = new Set(baseMessages.map((message) => String(message.id)));
  const mergedMessages = [...baseMessages];

  nextMessages.forEach((message) => {
    if (messageIds.has(String(message.id))) return;

    mergedMessages.push(message);
    messageIds.add(String(message.id));
  });

  return mergedMessages;
};

/** Contacts and groups that can be mentioned, each listed once. */
export const buildMentionOptions = (
  contacts: MessagingConversation[],
  conversations: MessagingConversation[]
): MessagingMention[] => {
  const seenMentions = new Set<string>();

  return [
    ...contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      kind: 'direct' as const,
      description: contact.department,
    })),
    ...conversations
      .filter((conversation) => conversation.kind === 'group')
      .map((conversation) => ({
        id: conversation.id,
        name: conversation.name,
        kind: 'group' as const,
        description: conversation.department,
      })),
  ].filter((mention) => {
    const mentionKey = `${mention.kind}:${String(mention.id)}`;

    if (seenMentions.has(mentionKey)) return false;

    seenMentions.add(mentionKey);
    return true;
  });
};

/** Close a dialog once its submit is confirmed; `false` (sync or async) keeps it open. */
export const closeWhenConfirmed = (result: MessagingSendResult, close: () => void): MessagingSendResult => {
  if (result instanceof Promise) {
    return result.then((confirmed) => {
      if (confirmed !== false) close();
      return confirmed;
    });
  }
  if (result !== false) close();
  return result;
};

/** The send payload only carries the optional parts that are present. */
export const buildSendPayload = (
  conversationId: MessagingContactId,
  content: string,
  { attachments, mentions, businessLinks, context }: {
    attachments?: MessagingAttachment[];
    mentions?: MessagingMention[];
    businessLinks?: MessagingBusinessReference[];
    context?: MessagingBusinessReference;
  } = {},
): MessagingSendMessagePayload => {
  const payload: MessagingSendMessagePayload = { conversationId, content };
  if (attachments?.length) payload.attachments = attachments;
  if (mentions?.length) payload.mentions = mentions;
  if (businessLinks?.length) payload.businessLinks = businessLinks;
  if (context) payload.context = context;
  return payload;
};

/**
 * MAIR-1160: the unread messages of the open thread, as ids. The BFF gives a count per conversation, not a flag per
 * message: the unread ones are the last `unreadCount` messages written by someone else, oldest first.
 */
export const unreadMessageIds = (messages: MessagingMessage[], unreadCount: number | undefined): string[] => {
  const count = Number.isSafeInteger(unreadCount) && (unreadCount ?? 0) > 0 ? unreadCount! : 0;
  if (count === 0) return [];
  // MAIR-1165: a system note counts as unread for nobody.
  const incoming = messages.filter((message) => message.direction !== 'outgoing' && message.kind !== 'system' && !message.deleted);
  return incoming.slice(-count).map((message) => String(message.id));
};

/** « 1 nouveau message » / « N nouveaux messages ». */
export const newMessagesLabel = (count: number) => (count === 1 ? '1 nouveau message' : `${count} nouveaux messages`);

/** MAIR-1162: « Envoyé » under my last confirmed message (the server messages are confirmed sends). */
export const withSentStatus = (messages: MessagingMessage[]): MessagingMessage[] => {
  let last = -1;
  messages.forEach((message, index) => { if (message.direction === 'outgoing' && message.kind !== 'system' && !message.deleted) last = index; });
  return last < 0 || messages[last].sendStatus
    ? messages
    : messages.map((message, index) => (index === last ? { ...message, sendStatus: 'sent' as const } : message));
};

/** MAIR-1163: user ids compared whatever their form (`user-7` or `7`). */
const userKey = (id: MessagingContactId | undefined) => String(id ?? '').replace(/^user-/, '');

/** MAIR-1163: the contact of a direct conversation, to preselect it in « Créer un groupe ». */
export const directContactIds = (conversation: MessagingConversation, contacts: MessagingConversation[]): MessagingContactId[] => {
  if (conversation.kind === 'group' || conversation.contactId === undefined) return [];
  const contact = contacts.find((item) => userKey(item.id) === userKey(conversation.contactId));
  return contact ? [contact.id] : [];
};

/** MAIR-1167: the text of a message as written, whatever its rendered `content`. */
export const messageText = (message: MessagingMessage): string =>
  message.text ?? (typeof message.content === 'string' ? message.content : '');

/** MAIR-1167: a short excerpt of a message, for the reply bar. */
export const messageExcerpt = (message: MessagingMessage, length = 100): string => {
  const text = messageText(message).replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};
