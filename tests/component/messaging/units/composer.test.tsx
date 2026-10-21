import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposerAttachmentChips } from '@/components/messaging/composer/ComposerAttachmentChips';
import { BusinessReferenceSuggestion, ComposerSuggestions, MentionSuggestion } from '@/components/messaging/composer/ComposerSuggestions';
import { ComposerToolbar } from '@/components/messaging/composer/ComposerToolbar';
import { EmojiPicker } from '@/components/messaging/composer/EmojiPicker';

const mention = { id: 'u1', name: 'Marie Dubois', kind: 'direct' as const, description: 'Finances' };
const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
const reference = { id: 'e1', kind: 'event' as const, title: 'Conseil municipal', description: 'Salle A' };

describe('MAIR-608 composer sub-components', () => {
  it('MentionSuggestion shows the contact department or "Groupe" and selects it', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<MentionSuggestion mention={mention} disabled={false} onSelect={onSelect} />);
    expect(screen.getByRole('button')).toHaveTextContent('@Marie DuboisFinances');
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mention);
    rerender(<MentionSuggestion mention={group} disabled onSelect={onSelect} />);
    expect(screen.getByRole('button')).toHaveTextContent('Groupe');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('BusinessReferenceSuggestion labels the kind and its description', async () => {
    const onSelect = vi.fn();
    render(<BusinessReferenceSuggestion reference={reference} disabled={false} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /#Conseil municipal/ })).toHaveTextContent('Événement du calendrier · Salle A');
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(reference);
  });

  it('ComposerSuggestions prefers mentions, falls back to references and hides when empty', () => {
    const handlers = { disabled: false, onSelectMention: vi.fn(), onSelectBusinessReference: vi.fn() };
    const { rerender, container } = render(<ComposerSuggestions mentions={[mention]} businessReferences={[reference]} {...handlers} />);
    expect(screen.getByText('@Marie Dubois')).toBeVisible();
    expect(screen.queryByText('#Conseil municipal')).toBeNull();
    rerender(<ComposerSuggestions mentions={[]} businessReferences={[reference]} {...handlers} />);
    expect(screen.getByText('#Conseil municipal')).toBeVisible();
    rerender(<ComposerSuggestions mentions={[]} businessReferences={[]} {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ComposerAttachmentChips lists draft files and removes one', async () => {
    const onRemove = vi.fn();
    const { rerender, container } = render(<ComposerAttachmentChips attachments={[{ id: 'a1', name: 'plan.pdf' }]} disabled={false} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retirer plan.pdf' }));
    expect(onRemove).toHaveBeenCalledWith('a1');
    rerender(<ComposerAttachmentChips attachments={[]} disabled={false} onRemove={onRemove} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ComposerToolbar wires each action and shows the emoji picker only when open', async () => {
    const actions = { onAttach: vi.fn(), onMention: vi.fn(), onBusinessReference: vi.fn(), onToggleEmoji: vi.fn(), onPickEmoji: vi.fn() };
    const { rerender } = render(<ComposerToolbar attachLabel="Joindre" emojiLabel="Réaction" disabled={false} busy={false} emojiOpen={false} {...actions} />);
    await userEvent.click(screen.getByRole('button', { name: 'Joindre' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mentionner un utilisateur' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mentionner un élément métier' }));
    await userEvent.click(screen.getByRole('button', { name: 'Réaction' }));
    expect([actions.onAttach, actions.onMention, actions.onBusinessReference, actions.onToggleEmoji].every(fn => fn.mock.calls.length === 1)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Ajouter 👍' })).toBeNull();
    rerender(<ComposerToolbar attachLabel="Joindre" emojiLabel="Réaction" disabled busy={false} emojiOpen {...actions} />);
    expect(screen.getByRole('button', { name: 'Joindre' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajouter 👍' })).toBeEnabled();
  });

  it('EmojiPicker offers the eight system emojis', async () => {
    const onPick = vi.fn();
    render(<EmojiPicker disabled={false} onPick={onPick} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter 🎉' }));
    expect(onPick).toHaveBeenCalledWith('🎉');
  });
});
