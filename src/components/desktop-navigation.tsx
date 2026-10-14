"use client";

import { defaultSidebarItems, mairie360LogoSrc, type AppShellProps } from '@mairie360/lib-components';
import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type FocusEvent } from 'react';
import { readSidebarPreference, sidebarPreferenceCookie } from '@/lib/sidebar-preference';

type Props = Pick<AppShellProps, 'activeItem' | 'isAdmin' | 'hrefs' | 'onNavigate' | 'onPageChange' | 'sidebarProps'> & { onCollapsedChange: (value: boolean) => void; inactive?: boolean };

function safeDestination(value: string | undefined) {
  const href = value?.trim();
  if (!href || href.startsWith('//') || href.includes('\\')) return undefined;
  if (/^https?:\/\//i.test(href)) {
    try { const url = new URL(href); return url.username || url.password ? undefined : href; } catch { return undefined; }
  }
  return /^[a-z][a-z\d+.-]*:/i.test(href) ? undefined : href;
}

/** Compatibility with published UI 0.8.0 until the shared library release. */
export default function DesktopNavigation({ activeItem = 'dashboard', isAdmin = false, hrefs, onNavigate, onPageChange, sidebarProps, onCollapsedChange, inactive = false }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [tooltip, setTooltip] = useState<{ id: string; label: string; top: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedItem = useRef<string | null>(null);
  const id = useId();
  const navId = `${id}-menu`;
  const items = (sidebarProps?.items ?? defaultSidebarItems).filter(item => (!item.adminOnly || isAdmin) && (safeDestination(hrefs[item.id]) || onPageChange));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const browser = window;
    const page = document;
    const sync = () => {
      if (page.hidden) return;
      try { setCollapsed(readSidebarPreference(page.cookie ?? '')); } catch { /* Browser storage can be unavailable; local controls remain usable. */ }
    };
    sync();
    browser.addEventListener('focus', sync);
    page.addEventListener('visibilitychange', sync);
    return () => {
      browser.removeEventListener('focus', sync);
      page.removeEventListener('visibilitychange', sync);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);
  useEffect(() => { onCollapsedChange(collapsed); setTooltip(null); }, [collapsed, onCollapsedChange]);

  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null; };
  const showTooltip = (event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, item: (typeof items)[number]) => {
    cancelClose();
    if (collapsed) setTooltip({ id: item.id, label: item.label, top: event.currentTarget.getBoundingClientRect().top });
  };
  const closeTooltip = () => {
    cancelClose();
    if (!focusedItem.current) closeTimer.current = setTimeout(() => setTooltip(null), 150);
  };
  const toggle = () => {
    const next = !collapsed;
    try { document.cookie = sidebarPreferenceCookie(next, window.location.hostname, window.location.protocol); } catch { /* Keep the local toggle usable without storage. */ }
    setCollapsed(next);
  };
  const navigate = (item: (typeof items)[number]) => {
    setTooltip(null);
    sidebarProps?.onItemSelect?.(item);
    const href = safeDestination(hrefs[item.id]);
    if (href) {
      if (/^https?:\/\//i.test(href)) window.location.assign(href);
      else if (onNavigate) onNavigate(href, item.id);
      else window.location.assign(href);
    } else onPageChange?.(item.id);
  };
  const logo = sidebarProps?.brandLogoSrc === undefined ? mairie360LogoSrc : sidebarProps.brandLogoSrc;

  return <aside className="app-desktop-navigation" aria-label="Navigation principale" data-collapsed={collapsed} inert={inactive}>
    <div className="app-navigation-brand">
      {logo && !logoFailed ? <img src={logo} alt={sidebarProps?.brandLogoAlt ?? 'Logo Mairie360'} onError={() => setLogoFailed(true)} /> : <span className="app-navigation-initial">{sidebarProps?.brandInitial ?? 'M'}</span>}
      <span className={collapsed ? 'app-visually-hidden' : ''}>{sidebarProps?.brandLabel ?? 'Mairie360'}</span>
    </div>
    <button type="button" className="app-navigation-toggle" aria-expanded={!collapsed} aria-controls={navId} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={collapsed ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      <span className="app-visually-hidden">{collapsed ? 'Développer la navigation' : 'Réduire la navigation'}</span>
    </button>
    <nav id={navId} aria-label="Menu principal">
      {items.map(item => {
        const Icon = item.icon;
        return <button key={item.id} type="button" aria-label={`${item.label}${item.badge ? ` (${item.badge})` : ''}`} aria-current={activeItem === item.id ? 'page' : undefined} aria-describedby={tooltip?.id === item.id ? `${id}-tooltip` : undefined} data-admin={item.id === 'admin'} onClick={() => navigate(item)} onMouseEnter={event => showTooltip(event, item)} onMouseLeave={closeTooltip} onFocus={event => { focusedItem.current = item.id; showTooltip(event, item); }} onBlur={() => { focusedItem.current = null; cancelClose(); setTooltip(null); }} onKeyDown={event => { if (event.key === 'Escape') { cancelClose(); setTooltip(null); } }}>
          <Icon aria-hidden="true" size={20} />
          <span className={collapsed ? 'app-visually-hidden' : 'app-navigation-label'}>{item.label}</span>
          {item.badge && <span className="app-navigation-badge" aria-hidden="true">{item.badge}</span>}
        </button>;
      })}
    </nav>
    {tooltip && <div id={`${id}-tooltip`} role="tooltip" className="app-navigation-tooltip" style={{ top: tooltip.top } as CSSProperties} onMouseEnter={cancelClose} onMouseLeave={closeTooltip}>{tooltip.label}</div>}
  </aside>;
}
