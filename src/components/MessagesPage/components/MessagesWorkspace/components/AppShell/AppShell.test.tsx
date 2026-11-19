import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { mairie360LogoSrc } from '@mairie360/lib-components/shell';
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ user: { name: 'Agent' }, isAdmin: false }), logoutAndReload: vi.fn() }));
vi.mock('@/lib/navigation', () => ({ getActiveFrontHrefs: () => ({ messages: '/', calendar: 'https://calendar.example/' }) }));
vi.mock('@/lib/front-urls', () => ({ frontUrl: (key: string) => (key === 'LOGIN_FRONT_URL' ? 'https://login.example/' : undefined) }));

import { AppShell } from './AppShell';
import { ShellInfoProvider } from '@/lib/shell-info-provider';

const navigation = () => {
  const band = document.querySelector<HTMLElement>('aside.app-desktop-navigation');
  if (!band) throw new Error('desktop navigation not rendered');
  return band;
};

describe('AppShell', () => {
  it('binds the session to the shared shell around the messaging content', () => {
    render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
    expect(screen.getByText('Contenu')).toBeInTheDocument(); expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('MAIR-844 shows the lib logo, the commune name and a complete footer', () => {
    render(
      <ShellInfoProvider info={{ communeName: 'Villeneuve', version: '3.2.1' }}>
        <AppShell activeItem="messages"><p>Contenu</p></AppShell>
      </ShellInfoProvider>,
    );
    const band = navigation();
    expect(band.querySelector('img.app-navigation-logo')).toHaveAttribute('src', mairie360LogoSrc);
    expect(within(band).getByText('Commune de')).toBeInTheDocument();
    expect(within(band).getByText('Villeneuve')).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Version 3.2.1')).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', 'https://login.example/mentions-legales');
    expect(within(footer).getByRole('link', { name: /confidentialit/i })).toHaveAttribute('href', 'https://login.example/confidentialite');
  });

  it('MAIR-844 keeps « Messagerie » active with its unread badge, and no badge at zero', () => {
    const { rerender } = render(<AppShell activeItem="messages" unreadCount={3}><p>Contenu</p></AppShell>);
    const active = within(navigation()).getByRole('button', { name: 'Messagerie (3)', hidden: true });
    expect(active).toHaveAttribute('aria-current', 'page');
    rerender(<AppShell activeItem="messages" unreadCount={0}><p>Contenu</p></AppShell>);
    expect(within(navigation()).getByRole('button', { name: 'Messagerie', hidden: true })).toHaveAttribute('aria-current', 'page');
  });

  it('MAIR-844 adds no local class to the lib frame', () => {
    const { container } = render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
    expect(container.querySelector('.messages-app-root')).toBeNull();
  });
});
