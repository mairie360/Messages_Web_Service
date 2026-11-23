/** How long a message reached from a search or a quote stays highlighted. */
export const REVEAL_HIGHLIGHT_MS = 2_000;

const prefersReducedMotion = (view: Window | null) =>
  typeof view?.matchMedia === 'function' && view.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * MAIR-1164 / MAIR-1167: scroll the thread smoothly (instantly under `prefers-reduced-motion`) to a loaded message
 * and highlight it for a moment (`data-revealed`, styled by the bubble). Answers whether the message was found in
 * the loaded page of the thread.
 */
export function revealMessage(region: HTMLElement | null, messageId: string | number): boolean {
  if (!region) return false;
  const target = Array.from(region.querySelectorAll<HTMLElement>('[data-messaging-message-id]'))
    .find(element => element.dataset.messagingMessageId === String(messageId));
  if (!target) return false;
  const view = region.ownerDocument.defaultView;
  target.scrollIntoView?.({ behavior: prefersReducedMotion(view) ? 'auto' : 'smooth', block: 'center' });
  target.setAttribute('data-revealed', '');
  const focusable = target.querySelector<HTMLElement>('[tabindex]');
  focusable?.focus({ preventScroll: true });
  view?.setTimeout(() => target.removeAttribute('data-revealed'), REVEAL_HIGHLIGHT_MS);
  return true;
}
