import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ConversationSearchPanel } from './ConversationSearchPanel';
import { highlightSegments } from './search-highlights';
import type { MessagingSearchRequest } from '../../messaging-types';

const conversation = { id: 'conversation-4', name: 'Conseil municipal', kind: 'group' as const };
const pages = {
  messages: { type: 'messages' as const, items: [{ messageId: 'message-7', authorName: 'Sophie Leroy', createdAt: '2026-06-23T12:32:00Z', excerpt: 'Le permis de construire est signé', highlights: [{ start: 3, length: 6 }] }], hasMore: true, total: 3 },
  files: { type: 'files' as const, items: [], hasMore: false, total: 0 },
  people: { type: 'people' as const, items: [{ id: 'user-3', name: 'Sophie Leroy' }, { id: 'user-2', name: 'Moi Agent' }], hasMore: false, total: 2 },
};
const search = (request: MessagingSearchRequest) => Promise.resolve(request.offset
  ? { ...pages[request.type], items: [{ ...pages.messages.items[0], messageId: 'message-1', excerpt: 'Permis déposé' }], hasMore: false }
  : pages[request.type]);

it('MAIR-1164 searches the three tabs after the agent stops typing, counts them and highlights the match', async () => {
  const user = userEvent.setup();
  const onSearch = vi.fn(search);
  const onOpenMessage = vi.fn(); const onClose = vi.fn();
  const { baseElement } = render(<ConversationSearchPanel open conversation={conversation} currentUserId="user-2" onClose={onClose} onSearch={onSearch} onOpenMessage={onOpenMessage} />);
  const dialog = screen.getByRole('dialog', { name: 'Rechercher dans la conversation' });
  const field = within(dialog).getByRole('searchbox');
  await waitFor(() => expect(field).toHaveFocus());
  expect(screen.getByText(/Saisissez un mot/)).toBeVisible();
  await user.type(field, 'permis');
  await screen.findByText('permis', { selector: 'mark' });
  // One request per tab for the whole word: the typing was debounced.
  expect(onSearch.mock.calls.map(([request]) => `${request.type}:${request.query}`)).toEqual(['messages:permis', 'files:permis', 'people:permis']);
  expect(screen.getByRole('tab', { name: /Messages/ })).toHaveTextContent('3');
  expect(screen.getByRole('tab', { name: /Personnes/ })).toHaveTextContent('2');
  expect((await axe(baseElement)).violations).toEqual([]);

  await user.click(screen.getByRole('button', { name: 'Afficher plus de résultats' }));
  await waitFor(() => expect(document.querySelector('[data-search-message-id="message-1"]')).not.toBeNull());
  expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'messages', offset: 1 }));

  await user.click(document.querySelector<HTMLElement>('[data-search-message-id="message-7"]')!);
  expect(onClose).toHaveBeenCalled();
  expect(onOpenMessage).toHaveBeenCalledWith('message-7');
});

it('MAIR-1164 shows an empty DataState per tab and « Écrire » for the other members only', async () => {
  const user = userEvent.setup();
  const onWriteTo = vi.fn();
  render(<ConversationSearchPanel open conversation={conversation} currentUserId="user-2" onClose={vi.fn()} onSearch={search} onOpenMessage={vi.fn()} onWriteTo={onWriteTo} />);
  await user.type(screen.getByRole('searchbox'), 'sophie');
  await user.click(await screen.findByRole('tab', { name: /Fichiers/ }));
  expect(await screen.findByText('Aucun fichier trouvé')).toBeVisible();
  await user.click(screen.getByRole('tab', { name: /Personnes/ }));
  expect(screen.getAllByRole('button', { name: /^Écrire à/ })).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Écrire à Sophie Leroy' }));
  expect(onWriteTo).toHaveBeenCalledWith({ id: 'user-3', name: 'Sophie Leroy' });
});

it('MAIR-1164 offers to retry a failed search', async () => {
  const user = userEvent.setup();
  const onSearch = vi.fn().mockRejectedValueOnce(new Error('down')).mockImplementation(search);
  render(<ConversationSearchPanel open conversation={conversation} onClose={vi.fn()} onSearch={onSearch} onOpenMessage={vi.fn()} />);
  await user.type(screen.getByRole('searchbox'), 'permis');
  expect(await screen.findByText('La recherche est indisponible.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Réessayer/ }));
  expect(await screen.findByText('permis', { selector: 'mark' })).toBeVisible();
});

it('MAIR-1164 keeps the matches the BFF located, ignoring out-of-range ones', () => {
  expect(highlightSegments('abc permis def', [{ start: 4, length: 6 }, { start: 50, length: 2 }, { start: 5, length: 1 }]))
    .toEqual([{ text: 'abc ', match: false }, { text: 'permis', match: true }, { text: ' def', match: false }]);
  expect(highlightSegments('', [])).toEqual([{ text: '', match: false }]);
});
