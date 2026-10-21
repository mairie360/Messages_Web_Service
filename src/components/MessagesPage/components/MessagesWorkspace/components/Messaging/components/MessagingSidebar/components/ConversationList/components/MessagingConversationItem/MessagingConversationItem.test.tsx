import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingConversationItem } from './MessagingConversationItem';
import { axe } from 'jest-axe';
it('keeps an unread conversation keyboard accessible and delegates selection', async () => {
  const onClick = vi.fn(); const { container } = render(<MessagingConversationItem conversation={{ id: 1, name: 'Anne Marie', lastMessage: 'Bonjour', unreadCount: 2 }} active onClick={onClick} />); await userEvent.tab(); await userEvent.keyboard('{Enter}'); expect(onClick).toHaveBeenCalledTimes(1); expect(screen.getByText('Bonjour')).toBeVisible(); expect((await axe(container)).violations).toEqual([]);
});
