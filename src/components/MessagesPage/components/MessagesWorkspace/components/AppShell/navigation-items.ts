import { defaultSidebarItems, type SidebarItem } from "@mairie360/lib-components/shell";

/** Sum of the conversations' unread counts; invalid or negative values count as zero. */
export function totalUnread(conversations: ReadonlyArray<{ unreadCount?: number }>): number {
  return conversations.reduce((sum, item) =>
    sum + (Number.isSafeInteger(item.unreadCount) && (item.unreadCount ?? 0) > 0 ? item.unreadCount! : 0), 0);
}

/**
 * The lib navigation with the unread total on « Messagerie » (MAIR-844, MAIR-1156): the lib 2.3 `count`, shown
 * with its `Counter` (« 9+ » above nine) and named « Messagerie N à traiter » (visible text included, RGAA 11.9). Administration stays `adminOnly`
 * (shown by role), there is no Workflows item.
 */
export function navigationItems(unreadCount: number): SidebarItem[] {
  const count = Number.isSafeInteger(unreadCount) && unreadCount > 0 ? unreadCount : undefined;
  return defaultSidebarItems.map((item) => (item.id === "messages" && count ? { ...item, count } : item));
}
