"use client";

import { useCallback, useEffect, useState } from 'react';
import { pageStateUrl, readPageUrlState, type UrlSchema } from './page-url-state';

const URL_STATE_EVENT = 'mairie360:page-state';

/** Pass a module-level schema so subscriptions stay stable across renders. */
export function usePageUrlState(schema: UrlSchema) {
  const [state, setState] = useState(() => readPageUrlState('', schema));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const browser = typeof window === 'undefined' ? undefined : window;
    if (!browser) { setReady(true); return; }
    const receive = () => { setState(readPageUrlState(browser.location?.search ?? '', schema)); setReady(true); };
    receive();
    browser.addEventListener?.('popstate', receive);
    browser.addEventListener?.(URL_STATE_EVENT, receive);
    return () => { browser.removeEventListener?.('popstate', receive); browser.removeEventListener?.(URL_STATE_EVENT, receive); };
  }, [schema]);
  const update = useCallback((patch: Record<string, string>, mode: 'push' | 'replace' = 'push') => {
    const browser = typeof window === 'undefined' ? undefined : window;
    if (!browser?.history?.pushState || !browser.location.href) {
      // Standalone renderers can exercise the same validated state without a
      // browser. Production navigation always uses the native history below.
      const accepted = Object.fromEntries(Object.entries(patch).filter(([key]) => schema[key]).map(([key, value]) => [key, schema[key].accept(value) ? value : schema[key].defaultValue]));
      setState(current => ({ ...current, ...accepted }));
      return;
    }
    const next = pageStateUrl(browser.location.href, patch, schema);
    const current = `${browser.location.pathname}${browser.location.search}${browser.location.hash}`;
    if (next !== current) {
      // Next owns its history state; preserve it so back/forward keeps the same route.
      browser.history[mode === 'push' ? 'pushState' : 'replaceState'](browser.history.state, '', next);
      browser.dispatchEvent(new Event(URL_STATE_EVENT));
    }
  }, [schema]);
  return { state, ready, update };
}
