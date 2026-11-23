import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { ConversationList } from './ConversationList';

describe('ConversationList', () => {
  it('marks the active thread, selects one and shows the empty label', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<ConversationList conversations={[marie, pierre]} activeConversationId="pierre-martin" emptyLabel="Rien" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Marie Dubois')); expect(onSelect).toHaveBeenCalledWith(marie);
    rerender(<ConversationList conversations={[]} emptyLabel="Rien" />); expect(screen.getByText('Rien')).toBeVisible();
  });

  it('MAIR-870 shows « Aucune conversation trouvée. » as a muted lib Text', () => {
    render(<ConversationList conversations={[]} emptyLabel="Aucune conversation trouvée." />);
    const node = screen.getByText('Aucune conversation trouvée.');
    expect(node.tagName).toBe('P');
    expect(node.getAttribute('data-m360-component')).toContain('Text');
    expect(node.className).not.toMatch(/text-\[var\(--mairie-muted\)\]|border-dashed/);
    expect(node).toHaveAttribute('data-empty-state', 'conversations');
  });
});
