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
    await userEvent.click(screen.getByRole('button', { name: 'Mentionner un utilisateur' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mentionner un élément métier' }));
    await userEvent.click(screen.getByRole('button', { name: 'Réaction' }));
    expect([actions.onAttach, actions.onMention, actions.onBusinessReference, actions.onToggleEmoji].every(fn => fn.mock.calls.length === 1)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Ajouter 👍' })).toBeNull();
    rerender(<ComposerToolbar attachLabel="Joindre" emojiLabel="Réaction" disabled busy={false} emojiOpen {...actions} />);
    expect(screen.getByRole('button', { name: 'Joindre' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Ajouter 👍' })).toBeEnabled();
  });

  it('MAIR-872 renders every glyph through the lib Icon (16 px token, current colour) and keeps the accessible names', () => {
    const actions = { onAttach: vi.fn(), onMention: vi.fn(), onBusinessReference: vi.fn(), onToggleEmoji: vi.fn(), onPickEmoji: vi.fn() };
    render(<ComposerToolbar attachLabel="Joindre un fichier" emojiLabel="Ajouter un emoji" disabled={false} busy={false} emojiOpen={false} {...actions} />);
    for (const name of ['Joindre un fichier', 'Mentionner un utilisateur', 'Mentionner un élément métier', 'Ajouter un emoji']) {
      const svg = screen.getByRole('button', { name }).querySelector('svg');
      expect(svg).toHaveAttribute('data-m360-component', 'Icon');
      expect(svg).toHaveAttribute('data-size', 's');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg?.getAttribute('stroke-width')).not.toBe('1.8');
      expect(svg?.getAttribute('class')).not.toMatch(/\bsize-4\b/);
    }
  });
});
