import type {
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingContactId,
  MessagingConversation,
  MessagingMention,
  MessagingMessage,
  MessagingSendMessagePayload,
  MessagingSendResult,
} from './types';

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
