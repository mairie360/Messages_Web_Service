import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingConversationItem, unreadLabel } from './MessagingConversationItem';
import { axe } from 'jest-axe';
it('keeps an unread conversation keyboard accessible and delegates selection', async () => {
  const onClick = vi.fn(); const { container } = render(<MessagingConversationItem conversation={{ id: 1, name: 'Anne Marie', lastMessage: 'Bonjour', unreadCount: 2 }} active onClick={onClick} />); await userEvent.tab(); await userEvent.keyboard('{Enter}'); expect(onClick).toHaveBeenCalledTimes(1); expect(screen.getByText('Bonjour')).toBeVisible(); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-1157 truncates the name and the preview on one line, keeps the time in a fixed right column and counts with the lib Counter', () => {
  render(<MessagingConversationItem conversation={{ id: 1, name: 'Conseil municipal – élus de la commune', kind: 'group', lastMessage: 'Un très long aperçu', lastMessageAt: '15/09 13:30', unreadCount: 12, presence: 'online' }} />);
  const button = screen.getByRole('button');
  expect(screen.getByText('Conseil municipal – élus de la commune')).toHaveClass('truncate');
  expect(screen.getByText('Un très long aperçu')).toHaveClass('truncate');
  const time = screen.getByText('15/09 13:30'); expect(time).toHaveClass('w-[4.75rem]', 'shrink-0', 'text-right');
  const counter = button.querySelector('[data-m360-component~="Counter"]');
  expect(counter).toHaveTextContent('9+'); expect(counter).toHaveAttribute('aria-hidden', 'true');
  expect(button).toHaveAccessibleName(expect.stringContaining('12 messages non lus'));
  expect(screen.getByText('CM')).toBeVisible();
  expect(screen.getByRole('img', { name: 'En ligne' })).toBeInTheDocument();
  expect(unreadLabel(1)).toBe('1 message non lu');
});

it('MAIR-1157 shows no counter for a read conversation', () => {
  render(<MessagingConversationItem conversation={{ id: 1, name: 'Anne Marie', unreadCount: 0 }} />);
  expect(document.querySelector('[data-m360-component~="Counter"]')).toBeNull();
  expect(screen.queryByText(/non lu/)).toBeNull();
});
