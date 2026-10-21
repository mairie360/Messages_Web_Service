import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationActionsMenu } from '@/components/messaging/header/ConversationActionsMenu';
import { HeaderIconButton } from '@/components/messaging/header/HeaderIconButton';
import { HeaderIdentity, conversationMeta } from '@/components/messaging/header/HeaderIdentity';
import { defaultMessagingConversations } from '../messaging-fixtures';

const [marie, pierre] = defaultMessagingConversations;

describe('MAIR-608 header sub-components', () => {
  it('HeaderIdentity shows the name and the department with the presence', () => {
    render(<HeaderIdentity conversation={marie} />);
    expect(screen.getByRole('heading', { name: 'Marie Dubois' })).toBeVisible();
    expect(screen.getByText('Finances • En ligne')).toBeVisible();
    expect(conversationMeta(pierre)).toBe('Urbanisme');
    expect(conversationMeta({ id: 'x', name: 'X' })).toBe('');
  });

  it('HeaderIconButton is named by its label', async () => {
    const onClick = vi.fn();
    render(<HeaderIconButton label="Appeler" onClick={onClick}><span /></HeaderIconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Appeler' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ConversationActionsMenu opens read and delete, runs one and closes', async () => {
    const onRead = vi.fn(); const onDelete = vi.fn();
    render(<ConversationActionsMenu conversation={marie} label="Plus d'actions" deleteLabel="Supprimer" readPending={false} onReadVisibleMessages={onRead} onDeleteConversation={onDelete} />);
    const trigger = screen.getByRole('button', { name: "Plus d'actions" });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' }));
    expect(onRead).toHaveBeenCalledWith(marie);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith(marie);
  });

  it('ConversationActionsMenu closes on an outside click and only notifies when it holds no menu', async () => {
    const onMoreActions = vi.fn();
    const { rerender } = render(<ConversationActionsMenu conversation={marie} label="Plus" deleteLabel="Supprimer" readPending onReadVisibleMessages={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' })).toBeDisabled();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Marquer les messages affichés comme lus' })).toBeNull();
    rerender(<ConversationActionsMenu conversation={marie} label="Plus" deleteLabel="Supprimer" readPending={false} onMoreActions={onMoreActions} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(onMoreActions).toHaveBeenCalledWith(marie);
    expect(screen.getByRole('button', { name: 'Plus' })).toHaveAttribute('aria-expanded', 'false');
  });
});
