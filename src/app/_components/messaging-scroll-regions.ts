// lib-components 0.3.0 does not expose attributes for its two internal scroll panes.
// Keep keyboard scrolling and accessible names local to the Messages frontend.
export function prepareMessagingScrollRegions(container: HTMLDivElement | null) {
  if (!container) return;

  const regions = [
    ['.messages-module > aside > div:last-child', 'Conversations'],
    ['.messages-module > div:nth-child(2) > .flex-1', 'Messages de la conversation'],
  ] as const;

  for (const [selector, label] of regions) {
    const element = container.querySelector<HTMLElement>(selector);
    if (!element) continue;
    element.tabIndex = 0;
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', label);
  }
}
