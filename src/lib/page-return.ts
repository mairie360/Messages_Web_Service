/** Coalesce foreground events and release subscriptions when the page unmounts. */
export function subscribePageReturn(refresh: () => void) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  const browser = window;
  const page = document;
  let active = true;
  let pending = false;
  const receive = () => {
    if (page.hidden || pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; if (active && !page.hidden) refresh(); });
  };
  browser.addEventListener?.('focus', receive);
  page.addEventListener?.('visibilitychange', receive);
  return () => {
    active = false;
    browser.removeEventListener?.('focus', receive);
    page.removeEventListener?.('visibilitychange', receive);
  };
}
