import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ComposerToolbar } from './ComposerToolbar';

describe('ComposerToolbar', () => {
  it('wires each action and shows the emoji picker only when open', async () => {
    const actions = { onAttach: vi.fn(), onMention: vi.fn(), onBusinessReference: vi.fn(), onToggleEmoji: vi.fn(), onPickEmoji: vi.fn() };
    const { rerender } = render(<ComposerToolbar attachLabel="Joindre" emojiLabel="Réaction" disabled={false} busy={false} emojiOpen={false} {...actions} />);
    await userEvent.click(screen.getByRole('button', { name: 'Joindre' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mentionner une personne' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lier un élément' }));
    await userEvent.click(screen.getByRole('button', { name: 'Réaction' }));
    expect([actions.onAttach, actions.onMention, actions.onBusinessReference, actions.onToggleEmoji].every(fn => fn.mock.calls.length === 1)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Ajouter 👍' })).toBeNull();
    rerender(<ComposerToolbar attachLabel="Joindre" emojiLabel="Réaction" disabled busy={false} emojiOpen {...actions} />);
    expect(screen.getByRole('button', { name: 'Joindre' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Ajouter 👍' })).toBeEnabled();
  });

  it('MAIR-872 renders every glyph through the lib Icon (16 px token, current colour) and keeps the accessible names', () => {
    const actions = { onAttach: vi.fn(), onMention: vi.fn(), onBusinessReference: vi.fn(), onToggleEmoji: vi.fn(), onPickEmoji: vi.fn() };
    render(<ComposerToolbar attachLabel="Joindre un fichier" emojiLabel="Ajouter un emoji" disabled={false} busy={false} emojiOpen={false} {...actions} />);
    for (const name of ['Joindre un fichier', 'Mentionner une personne', 'Lier un élément', 'Ajouter un emoji']) {
      const svg = screen.getByRole('button', { name }).querySelector('svg');
      expect(svg).toHaveAttribute('data-m360-component', 'Icon');
      expect(svg).toHaveAttribute('data-size', 's');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg?.getAttribute('stroke-width')).not.toBe('1.8');
      expect(svg?.getAttribute('class')).not.toMatch(/\bsize-4\b/);
    }
  });

  it('MAIR-1158 renders lib icon buttons with explicit glyphs, each described by its tooltip', () => {
    const actions = { onAttach: vi.fn(), onMention: vi.fn(), onBusinessReference: vi.fn(), onToggleEmoji: vi.fn(), onPickEmoji: vi.fn() };
    render(<ComposerToolbar attachLabel="Joindre un fichier" emojiLabel="Insérer un emoji" disabled={false} busy={false} emojiOpen={false} {...actions} />);
    const expected: Record<string, [string, RegExp]> = {
      'Joindre un fichier': ['lucide-file-up', /^Joindre un fichier$/],
      'Mentionner une personne': ['lucide-at-sign', /Mentionner une personne \(@\)/],
      'Lier un élément': ['lucide-hash', /projet, tâche, dossier, événement/],
      'Insérer un emoji': ['lucide-smile-plus', /^Insérer un emoji$/],
    };
    for (const [name, [glyph, description]] of Object.entries(expected)) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('data-m360-component', expect.stringContaining('IconButton'));
      expect(button.querySelector('svg')?.getAttribute('class')).toContain(glyph);
      expect(button).toHaveAccessibleDescription(description);
    }
  });
});
