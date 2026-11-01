import type { MessagingBusinessReference, MessagingMention } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export const systemEmojiOptions = ['👍', '👏', '😊', '🎉', '✅', '🙏', '📎', '📌'];

export const revokeDraftUrl = (url: string) => {
  try {
    if (typeof URL !== 'undefined') URL.revokeObjectURL?.(url);
  } catch {
    // Cleanup must never turn an acknowledged send into a retry.
  }
};

/** Accent- and case-insensitive form used to match suggestions. */
export const normalizeMentionValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export interface TriggerMatch {
  start: number;
  query: string;
}

/** The `@name` being typed at the end of the draft, if any. */
export const getTriggerMatch = (value: string, trigger: '@' | '#'): TriggerMatch | null => {
  const match = value.match(new RegExp(`(^|\\s)\\${trigger}([^\\s@#]*)$`));

  if (!match || match.index === undefined) return null;

  return {
    start: match.index + match[1].length,
    query: match[2],
  };
};

/** The `#title` being typed at the end of the draft; titles may contain spaces. */
export const getBusinessReferenceMatch = (value: string): TriggerMatch | null => {
  const match = value.match(/(^|\s)#([^#@\r\n]*)$/);

  if (!match || match.index === undefined) return null;

  return {
    start: match.index + match[1].length,
    query: match[2].trim(),
  };
};

export const appendTrigger = (value: string, trigger: '@' | '#') =>
  `${value}${value.trim() && !value.endsWith(' ') ? ` ${trigger}` : trigger}`;

/** Replace the typed trigger with the chosen token, followed by a space. */
export const insertToken = (value: string, match: TriggerMatch, token: string) =>
  `${value.slice(0, match.start)}${token} `;

export const mentionSuggestionsFor = (options: MessagingMention[], match: TriggerMatch | null) =>
  match
    ? options
        .filter((mention) => normalizeMentionValue(mention.name).includes(normalizeMentionValue(match.query)))
        .slice(0, 6)
    : [];

export const businessReferenceSuggestionsFor = (options: MessagingBusinessReference[], match: TriggerMatch | null) =>
  match
    ? options.filter((reference) =>
        normalizeMentionValue(reference.title).includes(normalizeMentionValue(match.query))
      )
    : [];

/** Add an item once, keyed by id. */
export const addOnce = <T extends { id: unknown }>(items: T[], item: T) =>
  items.some((current) => current.id === item.id) ? items : [...items, item];
