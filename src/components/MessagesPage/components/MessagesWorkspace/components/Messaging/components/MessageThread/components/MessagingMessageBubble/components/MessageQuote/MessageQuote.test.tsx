import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageQuote } from './MessageQuote';

it('MAIR-1167 shows the quoted author and excerpt and scrolls to the original on click', async () => {
  const onOpen = vi.fn();
  const { rerender } = render(<MessageQuote authorName="Sophie Leroy" excerpt="Le permis est signé" outgoing onOpen={onOpen} />);
  await userEvent.click(screen.getByRole('button', { name: 'Voir le message cité de Sophie Leroy' }));
  expect(onOpen).toHaveBeenCalled();
  rerender(<MessageQuote authorName="Sophie Leroy" excerpt="Le permis est signé" outgoing={false} deleted onOpen={onOpen} />);
  expect(screen.getByText('Message supprimé')).toBeVisible();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText('Sophie Leroy')).toBeNull();
});
