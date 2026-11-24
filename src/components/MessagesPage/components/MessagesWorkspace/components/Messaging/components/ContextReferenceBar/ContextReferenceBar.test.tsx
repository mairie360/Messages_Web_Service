import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContextReferenceBar } from './ContextReferenceBar';

describe('ContextReferenceBar', () => {
  it('names the linked item and opens it only when allowed', async () => {
    const reference = { id: 't1', kind: 'task' as const, title: 'Valider le budget' };
    const onOpen = vi.fn();
    const { rerender } = render(<ContextReferenceBar reference={reference} />);
    expect(screen.getByLabelText('Message contextuel')).toHaveTextContent('Tâche : Valider le budget');
    expect(screen.queryByRole('button', { name: 'Ouvrir' })).toBeNull();
    rerender(<ContextReferenceBar reference={reference} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(onOpen).toHaveBeenCalledWith(reference);
  });

  it('MAIR-1181 opens the page of the reference and offers « Retirer »', async () => {
    const reference = { id: 'project-7', kind: 'project' as const, title: 'Médiathèque', href: 'https://projects.test/?project=7' };
    const onRemove = vi.fn();
    const { rerender } = render(<ContextReferenceBar reference={reference} />);
    expect(screen.getByLabelText('Message contextuel')).toHaveTextContent('Projet : Médiathèque');
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toHaveAttribute('href', 'https://projects.test/?project=7');
    expect(screen.queryByRole('button', { name: 'Retirer le contexte' })).toBeNull();
    rerender(<ContextReferenceBar reference={reference} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retirer le contexte' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
