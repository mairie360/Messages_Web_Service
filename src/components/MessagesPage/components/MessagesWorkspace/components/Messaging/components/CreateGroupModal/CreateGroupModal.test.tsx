import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGroupModal } from './CreateGroupModal';
import { axe } from 'jest-axe';
it('creates a named group with the selected received members only', async () => {
  const user = userEvent.setup(); const onCreateGroup = vi.fn().mockResolvedValue(true); const { container } = render(<CreateGroupModal isOpen members={[{ id: 1, name: 'Anne Marie' }]} onCancel={vi.fn()} onCreateGroup={onCreateGroup} />); await user.type(screen.getByLabelText('Nom du groupe'), 'Accueil'); await user.click(screen.getByRole('checkbox', { name: /Anne Marie/ })); await user.click(screen.getByRole('button', { name: 'Créer le groupe' })); expect(onCreateGroup).toHaveBeenCalledWith({ name: 'Accueil', description: undefined, memberIds: [1] }); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-878 follows F6: required name, optional description, « Membres » with search and checkboxes, ErrorAlert on refusal', async () => {
  const user = userEvent.setup();
  const onCreateGroup = vi.fn().mockResolvedValue(false);
  render(<CreateGroupModal isOpen members={[{ id: 1, name: 'Anne Marie' }, { id: 2, name: 'Paul Durand' }]} onCancel={vi.fn()} onCreateGroup={onCreateGroup} />);
  const name = screen.getByLabelText(/Nom du groupe/);
  expect(name).toBeRequired();
  expect(screen.getByLabelText('Description (optionnel)')).not.toBeRequired();
  const members = screen.getByRole('group', { name: 'Membres' });
  expect(members.querySelector('legend [data-m360-component~="Text"]')).toHaveTextContent('Membres');
  expect(screen.getByRole('searchbox', { name: 'Rechercher un contact' })).toBeVisible();
  const create = screen.getByRole('button', { name: 'Créer le groupe' });
  expect(create.querySelector('svg')).not.toBeNull();
  expect(create).toBeDisabled();
  await user.type(name, 'Équipe');
  await user.click(screen.getByRole('checkbox', { name: 'Anne Marie' }));
  expect(create).toBeEnabled();
  await user.click(create);
  const alert = await screen.findByRole('alert');
  expect(alert.getAttribute('data-m360-component')).toContain('ErrorAlert');
  expect(alert).toHaveTextContent('Le groupe n’a pas pu être créé. Vos saisies sont conservées ; vous pouvez réessayer.');
  expect(name).toHaveValue('Équipe');
  expect(screen.getByRole('checkbox', { name: 'Anne Marie' })).toBeChecked();
});
