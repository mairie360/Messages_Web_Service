import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MessageSendStatus } from './MessageSendStatus';

it('MAIR-1162 shows each state with its lib glyph, and a lib link button to retry a failed send', async () => {
  const onRetry = vi.fn();
  const { container, rerender } = render(<MessageSendStatus status="sent" />);
  expect(screen.getByText('Envoyé')).toBeVisible();
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-check');
  rerender(<MessageSendStatus status="sending" />);
  expect(screen.getByText('Envoi…')).toBeVisible();
  const loader = container.querySelector('svg')!;
  expect(loader.getAttribute('class')).toContain('lucide-loader-circle');
  // The loader only turns without prefers-reduced-motion.
  expect(loader.getAttribute('class')).toContain('motion-safe:animate-spin');
  expect(loader.getAttribute('class')).not.toMatch(/(^|\s)animate-spin/);
  rerender(<MessageSendStatus status="failed" onRetry={onRetry} />);
  expect(screen.getByText('Non envoyé ·')).toBeVisible();
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-circle-alert');
  const retry = screen.getByRole('button', { name: 'Réessayer l’envoi' });
  expect(retry).toHaveAttribute('data-m360-component', expect.stringContaining('Button'));
  expect(retry.querySelector('svg')?.getAttribute('class')).toContain('lucide-refresh-cw');
  await userEvent.click(retry); expect(onRetry).toHaveBeenCalledTimes(1);
});
