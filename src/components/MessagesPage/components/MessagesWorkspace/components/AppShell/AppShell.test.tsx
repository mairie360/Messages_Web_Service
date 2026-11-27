import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { mairie360LogoSrc } from '@mairie360/lib-components/shell';
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ user: { name: 'Agent' }, isAdmin: false }), logoutAndReload: vi.fn() }));
vi.mock('@/lib/navigation', () => ({ getActiveFrontHrefs: () => ({ messages: '/', calendar: 'https://calendar.example/' }) }));
vi.mock('@/lib/front-urls', () => ({ frontUrl: (key: string) => (key === 'LOGIN_FRONT_URL' ? 'https://login.example/' : undefined) }));

import { AppShell, type ShellNotifications } from './AppShell';
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

  it('MAIR-844 shows the lib logo and the commune name; MAIR-1156 hides the footer', () => {
    render(
      <ShellInfoProvider info={{ communeName: 'Villeneuve', version: '3.2.1' }}>
        <AppShell activeItem="messages"><p>Contenu</p></AppShell>
      </ShellInfoProvider>,
    );
    const band = navigation();
    expect(band.querySelector('img.app-navigation-logo')).toHaveAttribute('src', mairie360LogoSrc);
    expect(within(band).getByText('Commune de')).toBeInTheDocument();
    expect(within(band).getByText('Villeneuve')).toBeInTheDocument();
    // MAIR-1156: the lib 2.3 page base renders no footer (showFooter={false}).
    expect(document.querySelector('footer, [role="contentinfo"]')).toBeNull();
    expect(screen.queryByText('Version 3.2.1')).toBeNull();
  });

  it('MAIR-1156 keeps « Messagerie » active with its lib Counter (« 9+ » above nine), and none at zero', () => {
    const { rerender } = render(<AppShell activeItem="messages" unreadCount={3}><p>Contenu</p></AppShell>);
    const active = within(navigation()).getByRole('button', { name: 'Messagerie 3 à traiter', hidden: true });
    expect(active).toHaveAttribute('aria-current', 'page');
    rerender(<AppShell activeItem="messages" unreadCount={14}><p>Contenu</p></AppShell>);
    const capped = within(navigation()).getByRole('button', { name: 'Messagerie 9+ à traiter', hidden: true });
    expect(capped).toHaveAttribute('aria-current', 'page'); expect(capped).toHaveTextContent('9+');
    rerender(<AppShell activeItem="messages" unreadCount={0}><p>Contenu</p></AppShell>);
    expect(within(navigation()).getByRole('button', { name: 'Messagerie', hidden: true })).toHaveAttribute('aria-current', 'page');
  });

  const mentionBell = (read = false): ShellNotifications => {
    const item = {
      id: 'message-9', title: 'Mention dans « Urbanisme »', message: 'Un message vous mentionne.', category: 'messages' as const,
      read, href: '/?conversation=conversation-7', clickable: true, date: '2026-11-24T10:00:00.000Z',
    };
    return {
      count: read ? 0 : 1,
      source: { list: async () => [item], markRead: async (ids: string[]) => ids },
      conversationOf: (href: string) => (href === item.href ? 'conversation-7' : null),
    };
  };

  it('MAIR-1182 the header bell counts the unread mentions', () => {
    const { rerender } = render(<AppShell activeItem="messages" notifications={mentionBell()}><p>Contenu</p></AppShell>);
    expect(screen.getByRole('button', { name: 'Notifications, 1 non lues' })).toBeInTheDocument();
    rerender(<AppShell activeItem="messages" notifications={mentionBell(true)}><p>Contenu</p></AppShell>);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('MAIR-1182 the bell lists the mention and its link opens the conversation without reloading the page', async () => {
    const onOpenConversation = vi.fn();
    render(<AppShell activeItem="messages" notifications={mentionBell()} onOpenConversation={onOpenConversation}><p>Contenu</p></AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 non lues' }));
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(await within(dialog).findByText('Mention dans « Urbanisme »')).toBeInTheDocument();
    const link = within(dialog).getByRole('link', { name: 'Ouvrir' });
    expect(link).toHaveAttribute('href', '/?conversation=conversation-7');
    const followed = fireEvent.click(link);
    expect(followed).toBe(false); // default prevented: no navigation
    expect(onOpenConversation).toHaveBeenCalledWith('conversation-7');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull();
  });

  it('MAIR-1182 a modified click on the link keeps the browser behaviour (new tab)', async () => {
    const onOpenConversation = vi.fn();
    render(<AppShell activeItem="messages" notifications={mentionBell()} onOpenConversation={onOpenConversation}><p>Contenu</p></AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 non lues' }));
    const link = await screen.findByRole('link', { name: 'Ouvrir' });
    const followed = fireEvent.click(link, { ctrlKey: true });
    expect(followed).toBe(true); // default kept: the browser opens the link (jsdom may log that it cannot navigate)
    expect(onOpenConversation).not.toHaveBeenCalled();
  });

  it('MAIR-1230 the header search asks GET /search on this origin and links a message to its conversation', async () => {
    const answer = { groups: [{ module: 'messages', items: [{ kind: 'message', id: 7, title: 'Sophie Leroy', excerpt: 'Le permis est signé', parent_id: 5, updated_at: '2026-11-20T09:30:00.000Z' }] }], unavailable: [] };
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(answer), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'permis' } });
      const option = await screen.findByRole('option', { name: /Sophie Leroy/ }, { timeout: 2000 });
      expect(String(fetchMock.mock.calls[0][0])).toBe('/search?q=permis');
      expect(option).toHaveAttribute('data-href', '/?conversation=5&message=7');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('MAIR-1230 a failed search says so in the header without breaking the page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 502 })));
    try {
      render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'permis' } });
      await waitFor(() => expect(screen.getByText('La recherche est indisponible pour le moment.')).toBeInTheDocument(), { timeout: 2000 });
      expect(screen.getByText('Contenu')).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('MAIR-844 adds no local class to the lib frame', () => {
    const { container } = render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
    expect(container.querySelector('.messages-app-root')).toBeNull();
  });
});
