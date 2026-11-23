import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { ConversationActionsMenu } from './ConversationActionsMenu';

const direct = { id: 'd1', name: 'Sophie Leroy', kind: 'direct' as const };
const group = { id: 'g1', name: 'Conseil municipal', kind: 'group' as const };
const handlers = () => ({ onReadVisibleMessages: vi.fn(), onDeleteConversation: vi.fn(), onSearch: vi.fn(), onManageMembers: vi.fn(), onCreateGroupWith: vi.fn() });

describe('ConversationActionsMenu (MAIR-1163)', () => {
  it('lists the direct actions with the deletion separated, and the group actions', async () => {
    const user = userEvent.setup();
    const actions = handlers();
    const { rerender, container } = render(<ConversationActionsMenu conversation={direct} label="Plus d'actions" deleteLabel="Supprimer la conversation" readPending={false} {...actions} />);
    const trigger = screen.getByRole('button', { name: "Plus d'actions" });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await user.click(trigger);
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Marquer les messages comme lus', 'Rechercher dans la conversation', 'Créer un groupe avec Sophie Leroy', 'Supprimer la conversation',
    ]);
    expect(screen.getByRole('menuitem', { name: 'Supprimer la conversation' })).toHaveAttribute('data-variant', 'destructive');
    expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).not.toBeNull();
    expect((await axe(container)).violations).toEqual([]);
    await user.click(screen.getByRole('menuitem', { name: 'Créer un groupe avec Sophie Leroy' }));
    expect(actions.onCreateGroupWith).toHaveBeenCalledWith(direct);
    rerender(<ConversationActionsMenu conversation={group} label="Plus d'actions" deleteLabel="Supprimer la conversation" readPending={false} {...actions} />);
    await user.click(trigger);
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Marquer comme lus', 'Rechercher dans la conversation', 'Gérer les membres', 'Supprimer la conversation',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'Gérer les membres' })); expect(actions.onManageMembers).toHaveBeenCalledWith(group);
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Rechercher dans la conversation' })); expect(actions.onSearch).toHaveBeenCalledWith(group);
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Marquer comme lus' })); expect(actions.onReadVisibleMessages).toHaveBeenCalledWith(group);
  });

  it('shows search and members only when wired', async () => {
    render(<ConversationActionsMenu conversation={group} label="Plus" deleteLabel="Supprimer la conversation" readPending={false} onDeleteConversation={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Supprimer la conversation']);
    expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).toBeNull();
  });

  it('is keyboard navigable, closed by Échap and by an outside click, with the focus back on the trigger', async () => {
    const user = userEvent.setup();
    render(<ConversationActionsMenu conversation={direct} label="Plus d'actions" deleteLabel="Supprimer la conversation" readPending={false} {...handlers()} />);
    const trigger = screen.getByRole('button', { name: "Plus d'actions" });
    trigger.focus(); await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Marquer les messages comme lus' })).toHaveFocus();
    await user.keyboard('{End}'); expect(screen.getByRole('menuitem', { name: 'Supprimer la conversation' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull(); expect(trigger).toHaveFocus();
    await user.click(trigger); expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('confirms the deletion in a danger ConfirmModal, and cancelling keeps the conversation', async () => {
    const user = userEvent.setup();
    const actions = handlers();
    render(<ConversationActionsMenu conversation={direct} label="Plus d'actions" deleteLabel="Supprimer la conversation" readPending={false} {...actions} />);
    await user.click(screen.getByRole('button', { name: "Plus d'actions" }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la conversation' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer la conversation ?' });
    expect(dialog).toHaveTextContent('Sophie Leroy');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(actions.onDeleteConversation).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: "Plus d'actions" }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la conversation' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(actions.onDeleteConversation).toHaveBeenCalledWith(direct);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('disables « Marquer » while a read is pending and only notifies when it holds no menu', async () => {
    const onMoreActions = vi.fn();
    const { rerender } = render(<ConversationActionsMenu conversation={direct} label="Plus" deleteLabel="Supprimer" readPending onReadVisibleMessages={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(screen.getByRole('menuitem', { name: 'Marquer les messages comme lus' })).toHaveAttribute('aria-disabled', 'true');
    rerender(<ConversationActionsMenu conversation={direct} label="Plus" deleteLabel="Supprimer" readPending={false} onMoreActions={onMoreActions} />);
    fireEvent.mouseDown(document.body);
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(onMoreActions).toHaveBeenCalledWith(direct); expect(screen.queryByRole('menu')).toBeNull();
  });
});
