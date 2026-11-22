import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MentionSuggestions, suggestionOptionId } from './MentionSuggestions';
import { mentionOptions } from '../../use-tag-suggestions';

it('MAIR-1166 groups the `@` suggestions in sections, marks the active one and chooses on click', async () => {
  const options = mentionOptions({ everyone: true, groups: [{ id: 'group-4', name: 'Service urbanisme' }], people: [{ id: 'user-3', name: 'Sophie Leroy' }] });
  const onSelect = vi.fn(); const onActiveChange = vi.fn();
  const { container } = render(<div role="combobox" aria-controls="list" aria-expanded="true" aria-label="Écrire"><MentionSuggestions id="list" options={options} activeIndex={1} onSelect={onSelect} onActiveChange={onActiveChange} /></div>);
  const list = screen.getByRole('listbox', { name: 'Personnes et groupes à mentionner' });
  expect(within(list).getByRole('group', { name: 'Tout le monde' })).toBeInTheDocument();
  expect(within(list).getByRole('group', { name: 'Groupes et services' })).toBeInTheDocument();
  expect(within(list).getByRole('group', { name: 'Personnes' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /@Service urbanisme/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('option', { name: /@Service urbanisme/ }).id).toBe(suggestionOptionId('list', 1));
  fireEvent.mouseEnter(screen.getByRole('option', { name: /@Sophie Leroy/ }));
  expect(onActiveChange).toHaveBeenCalledWith(2);
  fireEvent.click(screen.getByRole('option', { name: /@tout le monde/ }));
  expect(onSelect).toHaveBeenCalledWith(options[0]);
  expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-1166 shows the `#` suggestions with their kind and detail, and nothing without option', () => {
  const reference = { id: 'project-12', title: 'Médiathèque', kind: 'project' as const, description: 'Projet' };
  const { rerender } = render(<MentionSuggestions id="l" placement="bottom" options={[{ key: 'r', section: 'Éléments', reference }]} activeIndex={0} onSelect={vi.fn()} onActiveChange={vi.fn()} />);
  expect(screen.getByRole('listbox', { name: 'Éléments à lier' })).toHaveClass('top-[calc(100%+8px)]');
  expect(screen.getByRole('option', { name: /#Médiathèque/ })).toHaveTextContent('Projet · Projet');
  rerender(<MentionSuggestions id="l" options={[]} activeIndex={-1} onSelect={vi.fn()} onActiveChange={vi.fn()} />);
  expect(screen.queryByRole('listbox')).toBeNull();
});
