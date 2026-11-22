import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchMessageResult } from './SearchMessageResult';

it('MAIR-1164 shows the author, the date and the excerpt with its matches marked, and opens the message', async () => {
  const item = { messageId: 'message-7', createdAt: '2026-06-23T12:32:00Z', excerpt: 'Permis et permis', highlights: [{ start: 0, length: 6 }, { start: 10, length: 6 }] };
  const onOpen = vi.fn();
  const { container } = render(<SearchMessageResult item={item} onOpen={onOpen} />);
  expect(screen.getByText('Ancien membre')).toBeVisible();
  expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['Permis', 'permis']);
  await userEvent.click(screen.getByRole('button'));
  expect(onOpen).toHaveBeenCalledWith(item);
});
