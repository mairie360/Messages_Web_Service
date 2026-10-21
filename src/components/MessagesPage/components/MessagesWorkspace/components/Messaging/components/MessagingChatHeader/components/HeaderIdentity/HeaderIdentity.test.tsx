import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { HeaderIdentity, conversationMeta } from './HeaderIdentity';

describe('HeaderIdentity', () => {
  it('shows the name and the department with the presence', () => {
    render(<HeaderIdentity conversation={marie} />);
    expect(screen.getByRole('heading', { name: 'Marie Dubois' })).toBeVisible(); expect(screen.getByText('Finances • En ligne')).toBeVisible();
    expect(conversationMeta(pierre)).toBe('Urbanisme'); expect(conversationMeta({ id: 'x', name: 'X' })).toBe('');
  });
});
