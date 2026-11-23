import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MessageEditBox } from './MessageEditBox';

const message = {
  id: 'm1', content: 'Voir @Sophie Leroy et #Médiathèque', authorId: 'me',
  mentions: [{ id: 'user-3', name: 'Sophie Leroy' }],
  links: [{ id: 'project-12', kind: 'project' as const, title: 'Médiathèque', url: 'https://p/12' }],
};

it('MAIR-1168 saves the new text with the tags it keeps, Enregistrer disabled while empty or unchanged', async () => {
  const onSave = vi.fn(() => Promise.resolve(true));
  const { container } = render(<MessageEditBox message={message} initialText={message.content} onSave={onSave} onCancel={vi.fn()} />);
  const field = screen.getByRole('textbox', { name: 'Modifier le message' });
  await waitFor(() => expect(field).toHaveFocus());
  expect(screen.getByText('Échap pour annuler · Entrée pour enregistrer')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  fireEvent.change(field, { target: { value: '   ' } });
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  fireEvent.change(field, { target: { value: 'Voir @Sophie Leroy demain' } });
  expect((await axe(container)).violations).toEqual([]);
  fireEvent.keyDown(field, { key: 'Enter' });
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({
    content: 'Voir @Sophie Leroy demain',
    mentions: [expect.objectContaining({ id: 'user-3', target: 'person' })],
    businessLinks: [],
  }));
});

it('MAIR-1168 keeps the text and shows the error under the box when the save is refused, Échap cancels', async () => {
  const onSave = vi.fn().mockRejectedValueOnce(new Error('Le message a été supprimé.')).mockResolvedValueOnce(false);
  const onCancel = vi.fn();
  render(<MessageEditBox message={message} initialText={message.content} onSave={onSave} onCancel={onCancel} />);
  const field = screen.getByRole('textbox', { name: 'Modifier le message' });
  fireEvent.change(field, { target: { value: 'Nouveau texte' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(await screen.findByText('Le message a été supprimé.')).toBeVisible();
  expect(field).toHaveValue('Nouveau texte');
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(await screen.findByText('Le message n’a pas pu être modifié.')).toBeVisible();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(onCancel).toHaveBeenCalledTimes(2);
});

it('MAIR-1168 offers the composer suggestions after @ and # and inserts a frozen tag', async () => {
  const sources = {
    mentions: vi.fn(() => Promise.resolve({ everyone: false, groups: [], people: [{ id: 'user-4', name: 'Paul Martin' }] })),
    links: vi.fn(() => Promise.resolve([{ id: 'event-5', title: 'Conseil', kind: 'event' as const }])),
  };
  const onSave = vi.fn(() => true);
  render(<MessageEditBox message={{ id: 'm2', content: 'Bonjour' }} initialText="Bonjour" suggestionSources={sources} onSave={onSave} onCancel={vi.fn()} />);
  const field = screen.getByRole('textbox', { name: 'Modifier le message' });
  fireEvent.click(screen.getByRole('button', { name: 'Mentionner une personne' }));
  expect(field).toHaveValue('Bonjour @');
  await screen.findByRole('option', { name: /@Paul Martin/ });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'Tab' });
  expect(field).toHaveValue('Bonjour @Paul Martin ');
  fireEvent.click(screen.getByRole('button', { name: 'Lier un élément' }));
  fireEvent.click(await screen.findByRole('option', { name: /#Conseil/ }));
  fireEvent.keyDown(field, { key: 'Enter' });
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    mentions: [expect.objectContaining({ id: 'user-4' })], businessLinks: [expect.objectContaining({ id: 'event-5' })],
  })));
});
