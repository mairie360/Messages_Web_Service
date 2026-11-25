import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MentionedPersonCard } from './MentionedPersonCard';

const person = { id: 'user-3', name: 'Manon Petit', department: 'Urbanisme', presence: 'online' as const };

it('MAIR-1182 the card of a mentioned agent names them, their service and presence, and « Écrire » writes to them', () => {
  const onWrite = vi.fn();
  const onClose = vi.fn();
  render(<MentionedPersonCard person={person} onWrite={onWrite} onClose={onClose} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Manon Petit');
  expect(dialog).toHaveTextContent('Urbanisme · En ligne');
  fireEvent.click(screen.getByRole('button', { name: 'Écrire à Manon Petit' }));
  expect(onWrite).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
  expect(onClose).toHaveBeenCalled();
});

it('MAIR-1182 the card of the agent themself has no « Écrire »', () => {
  render(<MentionedPersonCard person={{ id: 'user-2', name: 'Claire Martin' }} isCurrentUser onWrite={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toHaveTextContent('Claire Martin (vous)');
  expect(screen.getByRole('dialog')).toHaveTextContent('Aucune information complémentaire.');
  expect(screen.queryByRole('button', { name: /Écrire/ })).toBeNull();
});
