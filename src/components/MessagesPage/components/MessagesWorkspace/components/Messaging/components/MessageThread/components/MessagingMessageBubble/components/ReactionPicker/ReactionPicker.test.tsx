import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactionPicker, REACTION_EMOJIS } from './ReactionPicker';

it('MAIR-1170 offers the seven reactions, takes the focus, moves with the arrows and closes on Échap', async () => {
  const onPick = vi.fn(); const onClose = vi.fn();
  render(<ReactionPicker outgoing onPick={onPick} onClose={onClose} />);
  const group = screen.getByRole('group', { name: 'Choisir une réaction' });
  expect(screen.getAllByRole('button')).toHaveLength(REACTION_EMOJIS.length);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Réagir avec pouce levé' })).toHaveFocus());
  fireEvent.keyDown(group, { key: 'ArrowLeft' });
  expect(screen.getByRole('button', { name: 'Réagir avec validé' })).toHaveFocus();
  fireEvent.keyDown(group, { key: 'ArrowRight' });
  expect(screen.getByRole('button', { name: 'Réagir avec pouce levé' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Réagir avec fête' }));
  expect(onPick).toHaveBeenCalledWith('🎉');
  fireEvent.keyDown(group, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
