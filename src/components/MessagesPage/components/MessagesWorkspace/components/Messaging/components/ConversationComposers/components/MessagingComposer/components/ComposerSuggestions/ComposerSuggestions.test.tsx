import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BusinessReferenceSuggestion, ComposerSuggestions, MentionSuggestion } from './ComposerSuggestions';

const mention = { id: 'u1', name: 'Marie Dubois', kind: 'direct' as const, description: 'Finances' };
const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
const reference = { id: 'e1', kind: 'event' as const, title: 'Conseil municipal', description: 'Salle A' };

describe('ComposerSuggestions', () => {
  it('MentionSuggestion shows the contact department or « Groupe » and selects it', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<MentionSuggestion mention={mention} disabled={false} onSelect={onSelect} />);
    expect(screen.getByRole('button')).toHaveTextContent('@Marie DuboisFinances');
    await userEvent.click(screen.getByRole('button')); expect(onSelect).toHaveBeenCalledWith(mention);
    rerender(<MentionSuggestion mention={group} disabled onSelect={onSelect} />);
    expect(screen.getByRole('button')).toHaveTextContent('Groupe'); expect(screen.getByRole('button')).toBeDisabled();
  });
  it('BusinessReferenceSuggestion labels the kind and its description', async () => {
    const onSelect = vi.fn();
    render(<BusinessReferenceSuggestion reference={reference} disabled={false} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /#Conseil municipal/ })).toHaveTextContent('Événement du calendrier · Salle A');
    await userEvent.click(screen.getByRole('button')); expect(onSelect).toHaveBeenCalledWith(reference);
  });
  it('prefers mentions, falls back to references and hides when empty', () => {
    const handlers = { disabled: false, onSelectMention: vi.fn(), onSelectBusinessReference: vi.fn() };
    const { rerender, container } = render(<ComposerSuggestions mentions={[mention]} businessReferences={[reference]} {...handlers} />);
    expect(screen.getByText('@Marie Dubois')).toBeVisible(); expect(screen.queryByText('#Conseil municipal')).toBeNull();
    rerender(<ComposerSuggestions mentions={[]} businessReferences={[reference]} {...handlers} />);
    expect(screen.getByText('#Conseil municipal')).toBeVisible();
    rerender(<ComposerSuggestions mentions={[]} businessReferences={[]} {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });
});
