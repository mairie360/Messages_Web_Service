import { defaultSidebarItems, type SidebarItem } from "@mairie360/lib-components/shell";

/** Sum of the conversations' unread counts; invalid or negative values count as zero. */
export function totalUnread(conversations: ReadonlyArray<{ unreadCount?: number }>): number {
  return conversations.reduce((sum, item) =>
    sum + (Number.isSafeInteger(item.unreadCount) && (item.unreadCount ?? 0) > 0 ? item.unreadCount! : 0), 0);
}

/** The lib navigation with the unread badge on « Messagerie » (MAIR-844); no badge at zero. */
export function navigationItems(unreadCount: number): SidebarItem[] {
  const badge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : undefined;
  return defaultSidebarItems.map((item) => (item.id === "messages" && badge ? { ...item, badge } : item));
}
