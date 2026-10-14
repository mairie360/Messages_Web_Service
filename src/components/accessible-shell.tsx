"use client";

import { AppShell } from "@mairie360/lib-components";
import { useEffect, useId, useRef, useState, type CSSProperties, type ComponentProps } from "react";
import DesktopNavigation from './desktop-navigation';

// Keep 0.8.0's supplied navigation while the shared semantic fix awaits publication.
// The copyright remains visually in the sidebar; its landmark lives outside aside.
export default function AccessibleShell({ children, footerProps, ...props }: ComponentProps<typeof AppShell>) {
  const contentId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(76);
  const [collapsed, setCollapsed] = useState(false);
  const [navigationInactive, setNavigationInactive] = useState(false);
  useEffect(() => {
    const root = frame.current;
    if (!root || typeof MutationObserver === 'undefined') return;
    const receive = () => setNavigationInactive(Boolean(root.querySelector('[role="dialog"][aria-modal="true"]')));
    const observer = new MutationObserver(receive);
    observer.observe(root, { childList: true, subtree: true });
    receive();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const footer = frame.current?.querySelector("footer.app-accessible-footer");
    if (!footer) return;
    const measure = () => setFooterHeight(Math.ceil(footer.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    measure();
    return () => observer.disconnect();
  }, []);
  const content = useRef<HTMLDivElement>(null);
  return <div ref={frame} className="app-shell-frame" data-sidebar-collapsed={collapsed} style={{ "--app-footer-height": `${footerHeight}px` } as CSSProperties}>
    <a href={`#${contentId}`} className="app-skip-link" inert={navigationInactive} onClick={() => content.current?.focus()}>Aller au contenu</a>
    <DesktopNavigation {...props} inactive={navigationInactive} onCollapsedChange={setCollapsed} />
    <AppShell {...props} sidebarProps={{ ...props.sidebarProps, className: `app-published-sidebar ${props.sidebarProps?.className ?? ''}` }} footerPlacement="content" footerProps={{ ...footerProps, className: `app-accessible-footer ${footerProps?.className ?? ""}` }}>
      <div id={contentId} ref={content} tabIndex={-1} className="app-main-content">{children}</div>
    </AppShell>
  </div>;
}
