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
});
