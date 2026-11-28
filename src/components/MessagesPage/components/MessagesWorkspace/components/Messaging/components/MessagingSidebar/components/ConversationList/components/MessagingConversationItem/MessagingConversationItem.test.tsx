import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingConversationItem, unreadLabel } from './MessagingConversationItem';
import { conversationSubtitle } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model';
import { axe } from 'jest-axe';
it('keeps an unread conversation keyboard accessible and delegates selection', async () => {
  const onClick = vi.fn(); const { container } = render(<MessagingConversationItem conversation={{ id: 1, name: 'Anne Marie', lastMessage: 'Bonjour', unreadCount: 2 }} active onClick={onClick} />); await userEvent.tab(); await userEvent.keyboard('{Enter}'); expect(onClick).toHaveBeenCalledTimes(1); expect(screen.getByText('Bonjour')).toBeVisible(); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-1157 truncates the name and the preview on one line, keeps the time in the right column and counts with the lib Counter', () => {
  render(<MessagingConversationItem conversation={{ id: 1, name: 'Conseil municipal – élus de la commune', kind: 'group', lastMessage: 'Un très long aperçu', lastMessageAt: '15/09 13:30', unreadCount: 12, presence: 'online' }} />);
  const button = screen.getByRole('button');
  expect(screen.getByText('Conseil municipal – élus de la commune')).toHaveClass('truncate');
  expect(screen.getByText('Un très long aperçu')).toHaveClass('truncate');
  // MAIR-1253: the time sits above the counter in the third column, so the name keeps the whole middle column.
  const time = screen.getByText('15/09 13:30'); expect(time.parentElement).toContainElement(button.querySelector('[data-m360-component~="Counter"]') as HTMLElement);
  const counter = button.querySelector('[data-m360-component~="Counter"]');
  expect(counter).toHaveTextContent('9+'); expect(counter).toHaveAttribute('aria-hidden', 'true');
  expect(button).toHaveAccessibleName(expect.stringContaining('12 messages non lus'));
  // MAIR-1253: a group shows the users icon, not its initials.
  expect(document.querySelector('[data-group-avatar] svg')).not.toBeNull();
  expect(screen.getByRole('img', { name: 'En ligne' })).toBeInTheDocument();
  expect(unreadLabel(1)).toBe('1 message non lu');
});

it('MAIR-1157 shows no counter for a read conversation', () => {
  render(<MessagingConversationItem conversation={{ id: 1, name: 'Anne Marie', unreadCount: 0 }} />);
  expect(document.querySelector('[data-m360-component~="Counter"]')).toBeNull();
  expect(screen.queryByText(/non lu/)).toBeNull();
});

it('MAIR-1253 shows the full name, the service, the last message and the time of a direct conversation, in that order', () => {
  render(<MessagingConversationItem conversation={{ id: 2, name: 'Marie Dubois', department: 'Urbanisme', kind: 'direct', presence: 'online', lastMessage: 'Le dossier est prêt', lastMessageAt: '14:05', unreadCount: 2 }} />);
  const button = screen.getByRole('button');
  const texts = [...button.querySelectorAll('[data-conversation-name], [data-conversation-subtitle], [data-conversation-preview], [data-conversation-time]')].map(node => node.textContent);
  expect(texts).toEqual(['Marie Dubois', 'Urbanisme', 'Le dossier est prêt', '14:05']);
  expect(screen.getByText('Marie Dubois')).not.toHaveClass('w-[4.75rem]');
  expect(screen.getByRole('img', { name: 'En ligne' })).toBeInTheDocument();
  expect(button.querySelector('[data-m360-component~="Avatar"]')).toHaveAttribute('aria-hidden', 'true');
  expect(button).toHaveAccessibleName(expect.stringContaining('2 messages non lus'));
});

it('MAIR-1253 names a group « Groupe · N membres » under its name', () => {
  render(<MessagingConversationItem conversation={{ id: 3, name: 'Conseil municipal', kind: 'group', memberCount: 8, lastMessage: 'Ordre du jour' }} active />);
  expect(screen.getByText('Groupe · 8 membres')).toBeVisible();
  expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
  expect(conversationSubtitle({ id: 4, name: 'Binôme', kind: 'group', memberCount: 1 })).toBe('Groupe · 1 membre');
  expect(conversationSubtitle({ id: 5, name: 'Sans taille', kind: 'group' })).toBe('Groupe');
  expect(conversationSubtitle({ id: 6, name: 'Sans service', kind: 'direct', department: '  ' })).toBeUndefined();
});
it('MAIR-1253 a group line shows the users icon, never initials such as « [É »', () => {
  const { container } = render(<MessagingConversationItem conversation={{ id: 'g1', kind: 'group', name: '[TEST] Équipe voirie', memberCount: 4 }} />);
  expect(container.querySelector('[data-group-avatar] svg')).not.toBeNull();
  expect(container.querySelector('[data-conversation-subtitle]')).toHaveTextContent('Groupe · 4 membres');
  expect(container.textContent).not.toContain('[É');
});
