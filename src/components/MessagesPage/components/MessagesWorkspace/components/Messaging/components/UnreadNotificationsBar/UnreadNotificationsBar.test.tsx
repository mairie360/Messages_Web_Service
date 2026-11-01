import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { UnreadNotificationsBar } from './UnreadNotificationsBar';

describe('UnreadNotificationsBar', () => {
  it('pluralises the count and opens the first unread thread', async () => {
    const onOpen = vi.fn();
    const { rerender } = render(<UnreadNotificationsBar count={1} onOpen={onOpen} />);
    expect(screen.getByRole('status', { name: 'Notifications de messagerie' })).toHaveTextContent('1 notification non lue');
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<UnreadNotificationsBar count={3} firstUnreadConversation={marie} onOpen={onOpen} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 notifications non lues');
    await userEvent.click(screen.getByRole('button', { name: 'Voir Marie Dubois' }));
    expect(onOpen).toHaveBeenCalledWith(marie);
  });
});
