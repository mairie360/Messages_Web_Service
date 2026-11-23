import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageActionsToolbar } from './MessageActionsToolbar';

it('MAIR-1167 offers Réagir and Répondre, and Modifier / Supprimer on my messages only', async () => {
  const onReply = vi.fn(); const onEdit = vi.fn(); const onDelete = vi.fn(); const onReact = vi.fn();
  const { rerender } = render(<MessageActionsToolbar outgoing={false} onReact={onReact} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />);
  const toolbar = screen.getByRole('toolbar', { name: 'Actions du message' });
  expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['Réagir', 'Répondre']);
  await userEvent.click(screen.getByRole('button', { name: 'Répondre' }));
  expect(onReply).toHaveBeenCalled();
  expect(toolbar).not.toHaveAttribute('data-open');
  rerender(<MessageActionsToolbar open outgoing onReact={onReact} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />);
  expect(screen.getByRole('toolbar')).toHaveAttribute('data-open', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
  await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
  await userEvent.click(screen.getByRole('button', { name: 'Réagir' }));
  expect([onEdit, onDelete, onReact].every(handler => handler.mock.calls.length === 1)).toBe(true);
  rerender(<MessageActionsToolbar outgoing={false} onEdit={onEdit} />);
  expect(screen.queryByRole('toolbar')).toBeNull();
});
