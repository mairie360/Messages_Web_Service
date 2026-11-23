import { it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeletedMessage } from './DeletedMessage';

it('MAIR-1169 says « Message supprimé » in muted italics, on my side for my messages', () => {
  const { container, rerender } = render(<DeletedMessage outgoing />);
  expect(screen.getByText('Message supprimé')).toHaveClass('italic');
  expect(container.querySelector('[data-deleted-message]')).toHaveClass('self-end');
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-ban');
  rerender(<DeletedMessage outgoing={false} />);
  expect(container.querySelector('[data-deleted-message]')).not.toHaveClass('self-end');
});
