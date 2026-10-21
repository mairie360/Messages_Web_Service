import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { MentionedContent } from './MentionedContent';

const project = { id: 'p1', kind: 'project' as const, title: 'Rénovation école' };

describe('MentionedContent', () => {
  it('emphasises known @mentions and #references only, and leaves plain or rich content untouched', () => {
    const { container, rerender } = render(<MentionedContent content="Bonjour @Marie Dubois, voir #Rénovation école et @Inconnu" mentions={[{ id: 1, name: 'Marie Dubois' }]} businessReferences={[project]} />);
    expect([...container.querySelectorAll('strong')].map(node => [node.textContent, node.dataset.mentionKind])).toEqual([['@Marie Dubois', 'user'], ['#Rénovation école', 'business']]);
    rerender(<MentionedContent content="Sans mention" mentions={[]} businessReferences={[]} />);
    expect(container.querySelector('strong')).toBeNull();
    rerender(<MentionedContent content={<em>riche</em>} mentions={[{ id: 1, name: 'riche' }]} businessReferences={[]} />);
    expect(container.querySelector('em')).toHaveTextContent('riche');
  });
});
