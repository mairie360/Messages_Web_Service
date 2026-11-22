import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddMembersView } from './AddMembersView';

const candidates = [{ id: 'user-3', name: 'Sophie Leroy', department: 'Urbanisme' }, { id: 'user-4', name: 'Élodie Morel' }];

it('MAIR-1165 filters the agents, ticks them and validates the selection', async () => {
  const user = userEvent.setup();
  const onSelectedIdsChange = vi.fn(); const onSubmit = vi.fn(); const onCancel = vi.fn();
  const { rerender } = render(<AddMembersView candidates={candidates} selectedIds={[]} onSelectedIdsChange={onSelectedIdsChange} pending={false} onCancel={onCancel} onSubmit={onSubmit} />);
  expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
  await user.type(screen.getByRole('searchbox'), 'elodie');
  expect(screen.queryByText(/Sophie Leroy/)).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: 'Élodie Morel' }));
  expect(onSelectedIdsChange).toHaveBeenCalledWith(['user-4']);
  rerender(<AddMembersView candidates={candidates} selectedIds={['user-4']} onSelectedIdsChange={onSelectedIdsChange} pending={false} onCancel={onCancel} onSubmit={onSubmit} />);
  await user.click(screen.getByRole('checkbox', { name: 'Élodie Morel' }));
  expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
  await user.click(screen.getByRole('button', { name: 'Ajouter (1)' }));
  expect(onSubmit).toHaveBeenCalled();
  await user.clear(screen.getByRole('searchbox')); await user.type(screen.getByRole('searchbox'), 'zzz');
  expect(screen.getByText('Aucun agent à ajouter')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(onCancel).toHaveBeenCalled();
});
