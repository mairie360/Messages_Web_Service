import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { ConversationActionsMenu } from './ConversationActionsMenu';

describe('ConversationActionsMenu', () => {
  it('opens read and delete, runs one and closes', async () => {
    const onRead = vi.fn(); const onDelete = vi.fn();
    render(<ConversationActionsMenu conversation={marie} label="Plus d'actions" deleteLabel="Supprimer" readPending={false} onReadVisibleMessages={onRead} onDeleteConversation={onDelete} />);
    const trigger = screen.getByRole('button', { name: "Plus d'actions" });
    await userEvent.click(trigger); expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' }));
    expect(onRead).toHaveBeenCalledWith(marie); expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger); await userEvent.click(screen.getByRole('button', { name: 'Supprimer' })); expect(onDelete).toHaveBeenCalledWith(marie);
  });
  it('closes on an outside click and only notifies when it holds no menu', async () => {
    const onMoreActions = vi.fn();
    const { rerender } = render(<ConversationActionsMenu conversation={marie} label="Plus" deleteLabel="Supprimer" readPending onReadVisibleMessages={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' })).toBeDisabled();
    fireEvent.mouseDown(document.body); expect(screen.queryByRole('button', { name: 'Marquer les messages affichés comme lus' })).toBeNull();
    rerender(<ConversationActionsMenu conversation={marie} label="Plus" deleteLabel="Supprimer" readPending={false} onMoreActions={onMoreActions} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(onMoreActions).toHaveBeenCalledWith(marie); expect(screen.getByRole('button', { name: 'Plus' })).toHaveAttribute('aria-expanded', 'false');
  });
});
