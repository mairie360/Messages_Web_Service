import type { MessagingBusinessReference, MessagingMention, MessagingMessage } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export type InlineMentionKind = 'user' | 'business';

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The message context first, then its links, each reference once. */
export const uniqueBusinessReferences = (message: MessagingMessage) =>
  [message.context, ...(message.businessLinks ?? [])].filter(
    (reference, index, references): reference is MessagingBusinessReference =>
      !!reference && references.findIndex((currentReference) => currentReference?.id === reference.id) === index
  );

/** `@name` and `#title` labels that actually occur in the content, with their kind. */
export const mentionKindsIn = (
  content: string,
  mentions: MessagingMention[],
  businessReferences: MessagingBusinessReference[]
) => {
  const mentionKinds = new Map<string, InlineMentionKind>();
  mentions.forEach((mention) => {
    const label = `@${mention.name}`;
    if (mention.name.trim() && content.includes(label)) mentionKinds.set(label, 'user');
  });
  businessReferences.forEach((reference) => {
    const label = `#${reference.title}`;
    if (reference.title.trim() && content.includes(label)) mentionKinds.set(label, 'business');
  });
  return mentionKinds;
};

/** Split content around the labels; the longest label wins and must end on a word boundary. */
export const splitOnMentions = (content: string, labels: string[]) => {
  const mentionPattern = [...labels]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  return content.split(new RegExp(`(${mentionPattern})(?![\\p{L}\\p{N}_])`, 'gu'));
};
