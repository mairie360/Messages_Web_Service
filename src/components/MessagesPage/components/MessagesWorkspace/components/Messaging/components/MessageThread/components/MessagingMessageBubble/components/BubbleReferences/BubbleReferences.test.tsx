import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BubbleReferences } from './BubbleReferences';

const project = { id: 'p1', kind: 'project' as const, title: 'Rénovation école' };
const linked = { id: 't1', kind: 'task' as const, title: 'Devis', href: 'https://projects.example/tasks/t1' };

describe('BubbleReferences', () => {
  it('renders a link, a button or a label depending on what is available', async () => {
    const onReferenceClick = vi.fn();
    const { rerender } = render(<BubbleReferences references={[project, linked]} outgoing={false} />);
    expect(screen.getByRole('link', { name: 'Devis' })).toHaveAttribute('href', linked.href); expect(screen.queryByRole('button')).toBeNull();
    rerender(<BubbleReferences references={[project]} outgoing onReferenceClick={onReferenceClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rénovation école' })); expect(onReferenceClick).toHaveBeenCalledWith(project);
  });
});
