import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { NotificationSource } from '@mairie360/lib-components/shell';
import { messageClient } from '../../clients/messageClient';
import {
  addMention, conversationHref, markConversationMentionsRead, markMentionsRead, mentionNotificationItems,
  mentionNotificationSource, unreadMentionCount, withMentionAuthor, type MentionEntry,
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

type Owned = { owner: string; entries: readonly MentionEntry[] };

const NO_ENTRIES: readonly MentionEntry[] = [];

const pageHref = () => (typeof window === 'undefined' ? 'http://localhost/' : window.location.href);

/**
 * Mention alerts of the signed-in account (`accountId`), kept in memory: `receiveMention` adds one entry per
 * mentioning message, unless the conversation is the one the agent is reading, then reads the conversation once to
 * name the author; `markConversationRead` marks read the mentions of a conversation the agent opens. Another account
 * signing in (another tab) starts from an empty bell.
 */
export function useMentionNotifications(conversations: readonly MessagingConversation[], accountId: string) {
  const [state, setState] = useState<Owned>({ owner: accountId, entries: NO_ENTRIES });
  const entries = state.owner === accountId ? state.entries : NO_ENTRIES;
  // A read answered after another account signed in must not write into its bell.
  const accountRef = useRef(accountId);
  useLayoutEffect(() => { accountRef.current = accountId; }, [accountId]);
  // Messages whose author was already asked for, so a repeated signal costs no second read.
  const requested = useRef(new Set<string>());
  const update = useCallback((change: (current: readonly MentionEntry[]) => readonly MentionEntry[]) =>
    setState(current => {
      if (accountId !== accountRef.current) return current;
      const base = current.owner === accountId ? current.entries : NO_ENTRIES;
      const next = change(base);
      return next === base && current.owner === accountId ? current : { owner: accountId, entries: next };
    }), [accountId]);

  const receiveMention = useCallback(
    (signal: { conversationId: string; messageId?: string }, openConversationId?: string | number) => {
      const { conversationId, messageId } = signal;
      update(current => addMention(current, signal, { now: new Date(), openConversationId }));
      const open = openConversationId !== undefined && String(openConversationId) === String(conversationId);
      const key = `${accountId}:${messageId}`;
      if (!messageId || !conversationId || open || requested.current.has(key)) return;
      requested.current.add(key);
      // The signal carries no author: one read of the conversation names them; on failure the alert keeps its
      // generic text.
      void messageClient.getConversationMessages(conversationId).then(page => {
        const author = page.messages?.find(message => String(message.id) === messageId)?.authorName;
        update(current => withMentionAuthor(current, messageId, author ?? undefined));
      }, () => undefined);
    },
    [update, accountId],
  );
  const markRead = useCallback((ids: string[]) => update(current => markMentionsRead(current, ids)), [update]);
  const markConversationRead = useCallback(
    (conversationId: string | number) => update(current => markConversationMentionsRead(current, conversationId)),
    [update],
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
