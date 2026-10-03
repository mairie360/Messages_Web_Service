const focusableSelector = 'a[href],button,input:not([type="hidden"]),select,textarea,[tabindex]';

/** Add keyboard lifecycle to published messaging dialogs without replacing their callbacks. */
export function manageMessagingModalFocus(container: HTMLElement) {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  if (!win) return () => {};
  let session: { modal: HTMLElement; opener: HTMLElement | null; tabIndex: string | null } | null = null;
  const available = (element: HTMLElement) => {
    const style = win.getComputedStyle(element);
    return element.isConnected && !element.matches(':disabled') &&
      !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
      style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const controls = (modal: HTMLElement) => Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => element.tabIndex >= 0 && available(element));
  const restore = (previous: NonNullable<typeof session>, returnFocus: boolean) => {
    if (previous.tabIndex === null) previous.modal.removeAttribute('tabindex');
    else previous.modal.setAttribute('tabindex', previous.tabIndex);
    if (!returnFocus || (doc.activeElement !== doc.body && !previous.modal.contains(doc.activeElement))) return;
    const fallback = container.querySelector<HTMLElement>('[role="region"][aria-label="Conversations"]');
    const target = previous.opener && available(previous.opener) ? previous.opener : fallback;
    if (target && available(target)) target.focus();
  };
  const sync = () => {
    const modal = container.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    if (session?.modal !== modal) {
      const previous = session;
      session = null;
      if (previous) restore(previous, !modal);
      if (modal) {
        const opener = previous?.opener ?? (doc.activeElement instanceof win.HTMLElement ? doc.activeElement : null);
        session = { modal, opener, tabIndex: modal.getAttribute('tabindex') };
        modal.tabIndex = -1;
      }
    }
    if (!session) return;
    const active = doc.activeElement;
    if (active instanceof win.HTMLElement && session.modal.contains(active) && available(active)) return;
    (controls(session.modal)[0] ?? session.modal).focus();
  };
  const keydown = (event: KeyboardEvent) => {
    if (!session || event.defaultPrevented || event.isComposing) return;
    const modal = session.modal;
    if (event.key === 'Escape') {
      // The published close button owns draft reset and pending guards; never bypass a disabled close.
      const close = modal.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]');
      if (close && available(close)) { event.preventDefault(); close.click(); }
      return;
    }
    if (event.key !== 'Tab') return;
    const items = controls(modal);
    const first = items[0];
    const last = items[items.length - 1];
    const active = doc.activeElement;
    if (!first) { event.preventDefault(); modal.focus(); }
    else if (!modal.contains(active) || active === modal || (event.shiftKey && active === first)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };
  const observer = new win.MutationObserver(sync);
  container.addEventListener('keydown', keydown);
  doc.addEventListener('focusin', sync);
  observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'aria-hidden'] });
  sync();
  return () => {
    observer.disconnect();
    container.removeEventListener('keydown', keydown);
    doc.removeEventListener('focusin', sync);
    const previous = session;
    session = null;
    if (previous) restore(previous, true);
  };
}
