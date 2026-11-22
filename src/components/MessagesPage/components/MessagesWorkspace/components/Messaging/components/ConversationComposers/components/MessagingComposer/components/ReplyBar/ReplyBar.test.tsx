import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplyBar } from './ReplyBar';

it('MAIR-1167 names the answered author and excerpt and cancels the reply', async () => {
  const onCancel = vi.fn();
  const { rerender } = render(<ReplyBar authorName="Sophie Leroy" excerpt="Le permis est signé" onCancel={onCancel} />);
  expect(screen.getByText('Réponse à Sophie Leroy')).toBeVisible();
  expect(screen.getByText('Le permis est signé')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Annuler la réponse' }));
  expect(onCancel).toHaveBeenCalled();
  rerender(<ReplyBar excerpt="…" onCancel={onCancel} />);
  expect(screen.getByText('Réponse à un message')).toBeVisible();
});
