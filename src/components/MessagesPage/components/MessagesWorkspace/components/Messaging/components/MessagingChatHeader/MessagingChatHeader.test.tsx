import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingChatHeader } from './MessagingChatHeader';
import { axe } from 'jest-axe';
it('MAIR-1158 shows call and visio disabled « bientôt disponible », the search only when wired and « Plus d’actions »', async () => {
  const conversation = { id: 1, name: 'Anne Marie', presence: 'online' as const };
  const onSearchConversation = vi.fn();
  const { container, rerender } = render(<MessagingChatHeader conversation={conversation} onDeleteConversation={vi.fn()} />);
  for (const name of ['Appeler', 'Lancer une visio']) {
    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(`${name} · bientôt disponible`);
  }
  expect(screen.getByRole('button', { name: 'Appeler' }).querySelector('svg')?.getAttribute('class')).toContain('lucide-phone');
  expect(screen.getByRole('button', { name: 'Lancer une visio' }).querySelector('svg')?.getAttribute('class')).toContain('lucide-video');
  expect(screen.getByRole('button', { name: "Plus d'actions" }).querySelector('svg')?.getAttribute('class')).toMatch(/lucide-(ellipsis|more-horizontal)/);
  expect(screen.queryByRole('button', { name: 'Rechercher dans la conversation' })).toBeNull();
  expect((await axe(container)).violations).toEqual([]);
  rerender(<MessagingChatHeader conversation={conversation} onSearchConversation={onSearchConversation} />);
  const search = screen.getByRole('button', { name: 'Rechercher dans la conversation' });
  expect(search.querySelector('svg')?.getAttribute('class')).toContain('lucide-text-search');
  await userEvent.click(search); expect(onSearchConversation).toHaveBeenCalledWith(conversation);
});

describe('MessagingChatHeader empty state', () => {
  it('MAIR-870 titles the empty header « Sélectionnez une conversation » with a semibold large lib Text', () => {
    render(<MessagingChatHeader />);
    const title = screen.getByText('Sélectionnez une conversation');
    expect(title.getAttribute('data-m360-component')).toContain('Text');
    expect(title.className).not.toContain('text-sm');
  });
});

it('MAIR-1225 RGAA 9.1: the thread title is an h2 under the page h1, with or without a conversation', () => {
  const { rerender } = render(<MessagingChatHeader conversation={{ id: 1, name: 'Équipe accueil' }} />);
  expect(screen.getByRole('heading', { level: 2, name: 'Équipe accueil' })).toBeVisible();
  rerender(<MessagingChatHeader conversation={null} />);
  expect(screen.getByRole('heading', { level: 2, name: 'Sélectionnez une conversation' })).toBeVisible();
  expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
});
