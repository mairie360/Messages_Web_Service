import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { GroupMembersPanel } from './GroupMembersPanel';

const conversation = { id: 'conversation-4', name: 'Conseil', kind: 'group' as const };
const members = {
  canManage: true,
  members: [
    { id: 'user-2', name: 'Moi Agent', isAdmin: true },
    { id: 'user-3', name: 'Sophie Leroy', department: 'Urbanisme', isAdmin: false },
  ],
};
const contacts = [{ id: 'user-3', name: 'Sophie Leroy' }, { id: 'user-4', name: 'Paul Martin' }];

it('MAIR-1165 lets the administrator add members, keeping the selection and showing the error when it is refused', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn().mockRejectedValueOnce(new Error('Paul Martin n’est pas joignable.')).mockResolvedValue(true);
  const { baseElement } = render(<GroupMembersPanel open conversation={conversation} members={members} currentUserId="user-2" contacts={contacts} onClose={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} onLeave={vi.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Membres du groupe' })).toBeVisible();
  expect(screen.getByText('Moi Agent (vous)')).toBeVisible();
  expect((await axe(baseElement)).violations).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'Ajouter des membres' }));
  // Only agents who are not members yet.
  expect(screen.queryByRole('checkbox', { name: /Sophie Leroy/ })).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: 'Paul Martin' }));
  await user.click(screen.getByRole('button', { name: 'Ajouter (1)' }));
  expect(await screen.findByText('Paul Martin n’est pas joignable.')).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'Paul Martin' })).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Ajouter (1)' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ajouter des membres' })).toBeVisible());
  expect(onAdd).toHaveBeenLastCalledWith(['user-4']);
});

it('MAIR-1165 removes a member, and every member may leave after a confirmation', async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn().mockResolvedValue(false);
  const onLeave = vi.fn().mockResolvedValue(true);
  render(<GroupMembersPanel open conversation={conversation} members={members} currentUserId="user-2" contacts={contacts} onClose={vi.fn()} onRemove={onRemove} onLeave={onLeave} />);
  await user.click(screen.getByRole('button', { name: 'Retirer Sophie Leroy du groupe' }));
  expect(await screen.findByText('Sophie Leroy n’a pas pu être retiré du groupe.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Quitter le groupe' }));
  await user.click(screen.getByRole('button', { name: 'Quitter' }));
  await waitFor(() => expect(onLeave).toHaveBeenCalled());
});

it('MAIR-1165 hides the administrator actions from a plain member, and shows loading and errors', async () => {
  const onRetry = vi.fn();
  const { rerender } = render(<GroupMembersPanel open conversation={conversation} members={{ ...members, canManage: false }} currentUserId="user-3" contacts={contacts} onClose={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onLeave={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Ajouter des membres' })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Retirer/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Quitter le groupe' })).toBeVisible();
  rerender(<GroupMembersPanel open conversation={conversation} members={null} contacts={contacts} onClose={vi.fn()} />);
  expect(screen.getByText('Chargement des membres…')).toBeInTheDocument();
  rerender(<GroupMembersPanel open conversation={conversation} members={null} loadError="Les membres du groupe sont indisponibles." contacts={contacts} onClose={vi.fn()} onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button', { name: /Réessayer/ }));
  expect(onRetry).toHaveBeenCalled();
});
