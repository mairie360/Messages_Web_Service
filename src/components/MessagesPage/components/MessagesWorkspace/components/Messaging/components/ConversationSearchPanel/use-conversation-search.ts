import React from 'react';

import type { MessagingSearchPage, MessagingSearchRequest, MessagingSearchType } from '../../messaging-types';

export const SEARCH_TYPES: MessagingSearchType[] = ['messages', 'files', 'people'];
/** Time the agent may keep typing before a search is sent. */
export const SEARCH_DEBOUNCE_MS = 300;

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';
type Pages = Partial<Record<MessagingSearchType, MessagingSearchPage>>;

/**
 * MAIR-1164: searches the three tabs of one conversation at once (their counters are shown together), after
 * `SEARCH_DEBOUNCE_MS` without typing. A newer query, a closed panel or another conversation aborts the requests
 * in flight; `loadMore` appends the next page of one tab.
 */
export function useConversationSearch(
  conversationKey: string | null,
  query: string,
  onSearch?: (request: MessagingSearchRequest) => Promise<MessagingSearchPage>,
) {
  const [status, setStatus] = React.useState<SearchStatus>('idle');
  const [pages, setPages] = React.useState<Pages>({});
  const [loadingMore, setLoadingMore] = React.useState(false);
  const controller = React.useRef<AbortController | null>(null);
  const trimmed = query.trim();
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    controller.current?.abort();
    setPages({});
    setLoadingMore(false);
    if (!conversationKey || !trimmed || !onSearch) { setStatus('idle'); return; }
    setStatus('loading');
    const current = new AbortController();
    controller.current = current;
    const timer = window.setTimeout(() => {
      Promise.all(SEARCH_TYPES.map(type => onSearch({ query: trimmed, type, signal: current.signal })))
        .then(results => {
          if (current.signal.aborted) return;
          setPages(Object.fromEntries(results.map((page, index) => [SEARCH_TYPES[index], page])) as Pages);
          setStatus('ready');
        })
        .catch(() => { if (!current.signal.aborted) setStatus('error'); });
    }, SEARCH_DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); current.abort(); };
  }, [conversationKey, trimmed, onSearch, attempt]);

  const loadMore = async (type: MessagingSearchType) => {
    const page = pages[type];
    const current = controller.current;
    if (!page?.hasMore || !onSearch || loadingMore || !current) return;
    setLoadingMore(true);
    try {
      const next = await onSearch({ query: trimmed, type, offset: page.items.length, signal: current.signal });
      if (current.signal.aborted) return;
      setPages(previous => ({ ...previous, [type]: { ...next, items: [...(previous[type]?.items ?? []), ...next.items] } }));
    } catch {
      if (!current.signal.aborted) setStatus('error');
    } finally {
      if (!current.signal.aborted) setLoadingMore(false);
    }
  };

  return { status, pages, loadingMore, loadMore, retry: () => setAttempt(value => value + 1) };
}
