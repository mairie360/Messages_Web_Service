import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { BusinessReferenceIcon, businessReferenceKindLabel, businessReferenceLabel } from './BusinessReferenceIcon';

describe('BusinessReferenceIcon', () => {
  it('labels and draws each kind of business reference', () => {
    const refs = [{ id: 'e', kind: 'event' as const, title: 'E' }, { id: 't', kind: 'task' as const, title: 'T' }, { id: 'p', kind: 'project' as const, title: 'P' }];
    expect(refs.map(businessReferenceLabel)).toEqual(['Événement', 'Tâche', 'Projet']);
    expect(businessReferenceKindLabel(refs[0])).toBe('Événement du calendrier');
    const { container } = render(<>{refs.map((reference) => <BusinessReferenceIcon key={reference.id} reference={reference} />)}</>);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });
});
