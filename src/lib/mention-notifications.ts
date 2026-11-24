import type { NotificationItem, NotificationSource } from '@mairie360/lib-components/shell';
import { idsMatch, type MessagingConversation } from './messaging-state';
import { pageStateUrl, type UrlSchema } from './page-url-state';

/**
 * Mention alerts of the header bell. Each `MENTIONED` signal of the WebSocket becomes one entry, kept in the memory of
 * the page (a reload forgets them) and told apart by its message: a mention that arrives again (a second socket, a
 * replayed signal) never makes a second entry.
 */

/** A message that mentions the agent. */
export interface MentionEntry {
  messageId: string;
  conversationId: string;
  /** When the signal was received (ISO 8601): the bell groups and dates the entries by it. */
  receivedAt: string;
  read: boolean;
  /** Who wrote the message, once the page has read it (absent until then, or when the read failed). */
  authorName?: string;
}

/** Entries kept at most; the oldest are forgotten first. */
export const MAX_MENTION_ENTRIES = 50;

/**
 * Adds the mention of `signal`, unless its message already has an entry or the agent is reading that conversation
 * (`openConversationId`, only given when the thread is visible): the agent sees the message there already.
 */
export function addMention(
  entries: readonly MentionEntry[],
  signal: { conversationId: string; messageId?: string },
  { now, openConversationId }: { now: Date; openConversationId?: string | number },
): readonly MentionEntry[] {
  const { conversationId, messageId } = signal;
  if (!messageId || !conversationId) return entries;
  if (openConversationId !== undefined && openConversationId !== '' && idsMatch(openConversationId, conversationId)) return entries;
  if (entries.some(entry => entry.messageId === messageId)) return entries;
  const next = [{ messageId, conversationId, receivedAt: now.toISOString(), read: false }, ...entries];
  return next.slice(0, MAX_MENTION_ENTRIES);
}

/** Marks read the entries of `messageIds`; returns the same list when nothing changed. */
export function markMentionsRead(entries: readonly MentionEntry[], messageIds: readonly string[]): readonly MentionEntry[] {
  if (!entries.some(entry => !entry.read && messageIds.includes(entry.messageId))) return entries;
  return entries.map(entry => (!entry.read && messageIds.includes(entry.messageId) ? { ...entry, read: true } : entry));
}

/** Marks read every entry of a conversation the agent opened. */
export function markConversationMentionsRead(entries: readonly MentionEntry[], conversationId: string | number): readonly MentionEntry[] {
  return markMentionsRead(entries, entries.filter(entry => idsMatch(entry.conversationId, conversationId)).map(entry => entry.messageId));
}

/** Records who wrote a mentioning message; returns the same list when nothing changes. */
export function withMentionAuthor(entries: readonly MentionEntry[], messageId: string, authorName: string | undefined): readonly MentionEntry[] {
  const name = authorName?.trim();
  if (!name || !entries.some(entry => entry.messageId === messageId && entry.authorName !== name)) return entries;
  return entries.map(entry => (entry.messageId === messageId ? { ...entry, authorName: name } : entry));
}

export const unreadMentionCount = (entries: readonly MentionEntry[]) => entries.filter(entry => !entry.read).length;

/** Link of a conversation on this page (`?conversation=<id>`), keeping the other query parameters of `pageHref`. */
export function conversationHref(pageHref: string, conversationId: string, schema: UrlSchema) {
  return pageStateUrl(pageHref, { conversation: conversationId }, schema);
}

/** The bell's view of the entries: the conversation's name as the list knows it now, and its link. */
export function mentionNotificationItems(
  entries: readonly MentionEntry[],
  conversations: readonly MessagingConversation[],
  hrefFor: (conversationId: string) => string,
): NotificationItem[] {
  return entries.map(entry => {
    const conversation = conversations.find(item => idsMatch(item.id, entry.conversationId));
    const name = conversation?.name?.trim();
    const direct = conversation?.kind === 'direct';
    const author = entry.authorName ?? (direct ? name : undefined);
    return {
      id: entry.messageId,
      title: name ? `Mention dans « ${name} »` : 'Mention dans une conversation',
      message: author ? `${author} vous a mentionné(e).` : 'Un message vous mentionne.',
      category: 'messages',
      read: entry.read,
      href: hrefFor(entry.conversationId),
      clickable: true,
      date: entry.receivedAt,
    };
  });
}

/** The port the lib `NotificationCenter` reads: the current items, and a local « marquer comme lu ». */
export function mentionNotificationSource(
  items: readonly NotificationItem[],
  markRead: (ids: string[]) => void,
): NotificationSource {
  return {
    list: async () => items.map(item => ({ ...item })),
    markRead: async ids => {
      const known = ids.filter(id => items.some(item => item.id === id));
      markRead(known);
      return known;
    },
  };
}
