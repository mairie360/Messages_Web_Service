import React from 'react';

/** Distance under which the thread counts as scrolled to its end. */
const BOTTOM_TOLERANCE = 4;

const reducedMotion = (view: Window | null) =>
  !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Scrolls the thread region (the DOM node, not React state). */
function scrollRegion(element: HTMLElement, top: number, behavior: ScrollBehavior) {
  if (typeof element.scrollTo === 'function') element.scrollTo({ top, behavior });
  else element.scrollTop = top;
}

export interface UnreadTracking {
  /** First unread message when the conversation was opened: the « Nouveaux messages » separator goes before it. */
  separatorBeforeId: string | null;
  /** Unread messages not seen yet (their bottom is under the visible part of the thread). */
  remaining: number;
  /** The pill is shown: unread messages are left and the end of the thread is not reached. */
  pillVisible: boolean;
  /** Pill click: smooth scroll to the last message (instant under prefers-reduced-motion), as an agent action. */
  scrollToEnd: () => void;
}

/**
 * MAIR-1160: reading of the open thread without the « Marquer comme lus » banner.
 * - At opening, the thread is placed on the first unread message (or at its end) by a programmatic scroll that never
 *   marks anything read.
 * - The count of the pill decreases as unread messages come into view.
 * - The conversation is marked read (`onRead`) when the agent reaches the end of the thread (wheel, touch, keyboard,
 *   pointer or the pill), or at once when the thread does not scroll.
 */
export function useUnreadTracking(
  region: React.RefObject<HTMLDivElement | null>,
  conversationKey: string | null,
  messageIds: string[],
  unreadIds: string[],
  onRead?: () => void,
): UnreadTracking {
  const [separatorBeforeId, setSeparatorBeforeId] = React.useState<string | null>(null);
  const [seen, setSeen] = React.useState<ReadonlySet<string>>(() => new Set());
  const [atBottom, setAtBottom] = React.useState(false);
  const openedKey = React.useRef<string | null>(null);
  const agentScroll = React.useRef(false);
  const readFor = React.useRef<string | null>(null);
  const onReadRef = React.useRef(onRead);
  React.useLayoutEffect(() => { onReadRef.current = onRead; });
  const unreadKey = unreadIds.join(',');

  const measure = React.useCallback(() => {
    const element = region.current;
    if (!element) return { bottom: false, visible: [] as string[] };
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_TOLERANCE;
    const limit = element.getBoundingClientRect().bottom;
    const visible = [...element.querySelectorAll<HTMLElement>('[data-messaging-message-id]')]
      .filter((node) => node.getBoundingClientRect().bottom <= limit + BOTTOM_TOLERANCE)
      .map((node) => node.dataset.messagingMessageId ?? '');
    return { bottom, visible };
  }, [region]);

  const markRead = React.useCallback(() => {
    if (!conversationKey || unreadKey === '' || !onReadRef.current || readFor.current === `${conversationKey}:${unreadKey}`) return;
    readFor.current = `${conversationKey}:${unreadKey}`;
    onReadRef.current?.();
  }, [conversationKey, unreadKey]);

  const update = React.useCallback(() => {
    const { bottom, visible } = measure();
    setAtBottom(bottom);
    if (visible.length) setSeen((current) => {
      const missing = visible.filter((id) => !current.has(id));
      return missing.length ? new Set([...current, ...missing]) : current;
    });
    if (bottom && agentScroll.current) markRead();
  }, [measure, markRead]);

  // Opening a conversation: separator on the first unread message, programmatic placement (never a read).
  React.useLayoutEffect(() => {
    const element = region.current;
    if (!element || !conversationKey || messageIds.length === 0 || openedKey.current === conversationKey) return;
    openedKey.current = conversationKey;
    agentScroll.current = false;
    readFor.current = null;
    setSeen(new Set());
    const first = unreadIds[0] ?? null;
    setSeparatorBeforeId(first);
    const target = first
      ? [...element.querySelectorAll<HTMLElement>('[data-messaging-message-id]')].find((node) => node.dataset.messagingMessageId === first) ?? null
      : null;
    scrollRegion(element, target
      ? Math.max(0, target.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - 48)
      : element.scrollHeight, 'auto');
    // A thread that does not scroll is read as soon as it is opened.
    // A thread that does not scroll is read as soon as it is opened (a thread without layout, hidden on a narrow
    // screen behind the list, is not).
    if (element.clientHeight > 0 && element.scrollHeight <= element.clientHeight + BOTTOM_TOLERANCE && first) markRead();
    update();
  }, [region, conversationKey, messageIds.length, unreadIds, markRead, update]);

  React.useEffect(() => {
    if (!conversationKey) openedKey.current = null;
  }, [conversationKey]);

  // New messages or a new unread set: measure again (a programmatic change never reads).
  React.useLayoutEffect(() => { update(); }, [messageIds.length, unreadKey, update]);

  React.useEffect(() => {
    const element = region.current;
    if (!element) return;
    const intent = () => { agentScroll.current = true; };
    const kinds = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    kinds.forEach((kind) => element.addEventListener(kind, intent, { passive: true }));
    element.addEventListener('scroll', update, { passive: true });
    return () => {
      kinds.forEach((kind) => element.removeEventListener(kind, intent));
      element.removeEventListener('scroll', update);
    };
  }, [region, update]);

  const scrollToEnd = () => {
    const element = region.current;
    if (!element) return;
    agentScroll.current = true;
    const behavior = reducedMotion(element.ownerDocument.defaultView) ? 'auto' : 'smooth';
    scrollRegion(element, element.scrollHeight, behavior);
    update();
  };

  const remaining = unreadIds.filter((id) => !seen.has(id)).length;
  return { separatorBeforeId, remaining, pillVisible: remaining > 0 && !atBottom, scrollToEnd };
}
