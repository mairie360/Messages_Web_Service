import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPersonResult } from './SearchPersonResult';

it('MAIR-1164 offers « Écrire » only when given', async () => {
  const onWrite = vi.fn();
  const { rerender } = render(<SearchPersonResult person={{ id: 'user-3', name: 'Sophie Leroy' }} onWrite={onWrite} />);
  await userEvent.click(screen.getByRole('button', { name: 'Écrire à Sophie Leroy' }));
  expect(onWrite).toHaveBeenCalledWith({ id: 'user-3', name: 'Sophie Leroy' });
  rerender(<SearchPersonResult person={{ id: 'user-3', name: 'Sophie Leroy' }} />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('Sophie Leroy')).toBeVisible();
});
