import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UnreadMessagesPill } from './UnreadMessagesPill';

it('MAIR-1160 announces the count in a polite live region and calls back on click', async () => {
  const onClick = vi.fn();
  const { rerender } = render(<UnreadMessagesPill count={3} visible onClick={onClick} />);
  const region = screen.getByRole('status');
  expect(region).toHaveAttribute('aria-live', 'polite');
  const button = screen.getByRole('button', { name: '3 nouveaux messages' });
  expect(button).toHaveAttribute('data-m360-component', expect.stringContaining('Button'));
  await userEvent.click(button); expect(onClick).toHaveBeenCalledTimes(1);
  rerender(<UnreadMessagesPill count={1} visible onClick={onClick} />);
  expect(screen.getByRole('button', { name: '1 nouveau message' })).toBeInTheDocument();
  rerender(<UnreadMessagesPill count={1} visible={false} onClick={onClick} />);
  expect(screen.queryByRole('button')).toBeNull(); expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
