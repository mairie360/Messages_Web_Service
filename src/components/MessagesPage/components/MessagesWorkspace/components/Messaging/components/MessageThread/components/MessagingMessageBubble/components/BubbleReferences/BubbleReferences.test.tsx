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
    expect(screen.getByRole('link', { name: 'Tâche · Devis' })).toHaveAttribute('href', linked.href); expect(screen.queryByRole('button')).toBeNull();
    rerender(<BubbleReferences references={[project]} outgoing onReferenceClick={onReferenceClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Projet · Rénovation école' })); expect(onReferenceClick).toHaveBeenCalledWith(project);
  });
  // MAIR-1253 (design-match, Figma F2): « Tâche · Relire le dossier ↗ », the title underlined when it opens something.
  it('MAIR-1253 reads the kind before the title and marks the openable ones', () => {
    const { container, rerender } = render(<BubbleReferences references={[linked]} outgoing={false} />);
    expect(screen.getByText('Tâche ·')).toBeVisible();
    expect(screen.getByText('Devis')).toHaveClass('underline');
    expect(container.querySelectorAll('svg').length).toBe(2);
    rerender(<BubbleReferences references={[{ id: 'e1', kind: 'event', title: 'Conseil municipal' }]} outgoing={false} />);
    expect(screen.getByText('Événement ·')).toBeVisible();
    expect(screen.getByText('Conseil municipal')).not.toHaveClass('underline');
  });
});
