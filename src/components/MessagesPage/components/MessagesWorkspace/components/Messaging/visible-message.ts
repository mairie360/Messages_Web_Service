const clips = (value: string) => /^(auto|scroll|hidden|clip)$/.test(value);

/** Read only after an explicit command; no observer or acknowledgement runs on mount. */
export function lastVisibleMessagingMessageId(region: HTMLElement | null): string | null {
  const document = region?.ownerDocument;
  const view = document?.defaultView;
  if (!region || !document || !view || document.hidden) return null;

  const bounds = region.getBoundingClientRect();
  const visible = {
    top: Math.max(0, bounds.top), bottom: Math.min(view.innerHeight, bounds.bottom),
    left: Math.max(0, bounds.left), right: Math.min(view.innerWidth, bounds.right),
  };
  for (let parent: HTMLElement | null = region; parent; parent = parent.parentElement) {
    const style = view.getComputedStyle(parent);
    if (parent.hidden || parent.hasAttribute('inert') || parent.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null;
    if (parent === region) continue;
    const rect = parent.getBoundingClientRect();
    if (clips(style.overflowY)) {
      visible.top = Math.max(visible.top, rect.top);
      visible.bottom = Math.min(visible.bottom, rect.bottom);
    }
    if (clips(style.overflowX)) {
      visible.left = Math.max(visible.left, rect.left);
      visible.right = Math.min(visible.right, rect.right);
    }
  }
  if (visible.bottom <= visible.top || visible.right <= visible.left) return null;

  const messages = region.querySelectorAll<HTMLElement>('[data-messaging-message-id]');
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const rect = message.getBoundingClientRect();
    const style = view.getComputedStyle(message);
    if (message.hidden || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' ||
        rect.width <= 0 || rect.height <= 0) continue;
    if (rect.bottom > visible.top && rect.top < visible.bottom &&
        rect.right > visible.left && rect.left < visible.right) {
      return message.dataset.messagingMessageId || null;
    }
  }
  return null;
}
