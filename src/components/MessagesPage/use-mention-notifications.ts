import { useCallback, useMemo, useState } from 'react';
import type { NotificationSource } from '@mairie360/lib-components/shell';
import {
  addMention, conversationHref, markConversationMentionsRead, markMentionsRead, mentionNotificationItems,
  mentionNotificationSource, unreadMentionCount, type MentionEntry,
} from '../../lib/mention-notifications';
import { messagingUrlSchema } from '../../lib/messaging-page-query';
import type { MessagingConversation } from '../../lib/messaging-state';

/** What the header bell needs: the unread count, the lib port and the conversation a link of the bell opens. */
export interface MentionNotifications {
  count: number;
  source: NotificationSource;
  /** The conversation of a bell link, or `null` for a link that is not one of the mentions. */
  conversationOf: (href: string) => string | null;
}

const pageHref = () => (typeof window === 'undefined' ? 'http://localhost/' : window.location.href);

/**
 * Mention alerts of the page, kept in memory: `receiveMention` adds one entry per mentioning message, unless the
 * conversation is the one the agent is reading; `markConversationRead` marks read the mentions of a conversation the
 * agent opens.
 */
export function useMentionNotifications(conversations: readonly MessagingConversation[]) {
  const [entries, setEntries] = useState<readonly MentionEntry[]>([]);

  const receiveMention = useCallback(
    (signal: { conversationId: string; messageId?: string }, openConversationId?: string | number) =>
      setEntries(current => addMention(current, signal, { now: new Date(), openConversationId })),
    [],
  );
  const markRead = useCallback((ids: string[]) => setEntries(current => markMentionsRead(current, ids)), []);
  const markConversationRead = useCallback(
    (conversationId: string | number) => setEntries(current => markConversationMentionsRead(current, conversationId)),
    [],
  );

  const items = useMemo(
    () => mentionNotificationItems(entries, conversations, id => conversationHref(pageHref(), id, messagingUrlSchema)),
    [entries, conversations],
  );
  // The bell reads the source again whenever it changes: keep it while the items stay the same (list refreshes).
  const itemsKey = JSON.stringify(items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => mentionNotificationSource(items, markRead), [itemsKey, markRead]);
  const conversationOf = useCallback((href: string) => {
    const item = items.find(entry => entry.href === href);
    return item ? entries.find(entry => entry.messageId === item.id)?.conversationId ?? null : null;
  }, [items, entries]);

  const notifications: MentionNotifications = useMemo(
    () => ({ count: unreadMentionCount(entries), source, conversationOf }),
    [entries, source, conversationOf],
  );
  return { mentionNotifications: notifications, receiveMention, markConversationRead };
}
