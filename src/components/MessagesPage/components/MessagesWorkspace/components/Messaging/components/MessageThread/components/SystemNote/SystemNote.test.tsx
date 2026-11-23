import { it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SystemNote } from './SystemNote';
import { joinNames, systemNoteText } from './system-note-text';

const event = (action: 'members_added' | 'member_removed' | 'member_left', actorId: string, userIds: string[], userNames: string[], actorName = 'Paul Martin') =>
  ({ action, actorId, actorName, userIds, userNames });

it('MAIR-1165 says each membership change from the agent’s point of view', () => {
  expect(systemNoteText(event('members_added', 'user-2', ['user-3'], ['Sophie Leroy']), 'user-2')).toBe('Vous avez ajouté Sophie Leroy au groupe.');
  expect(systemNoteText(event('members_added', 'user-5', ['user-3', 'user-4'], ['Sophie Leroy', 'Anne Morel']), 'user-2')).toBe('Paul Martin a ajouté Sophie Leroy et Anne Morel au groupe.');
  expect(systemNoteText(event('members_added', 'user-5', ['user-2'], ['Moi']), 2)).toBe('Paul Martin vous a ajouté au groupe.');
  expect(systemNoteText(event('member_removed', 'user-2', ['user-3'], ['Sophie Leroy']), 'user-2')).toBe('Vous avez retiré Sophie Leroy du groupe.');
  expect(systemNoteText(event('member_removed', 'user-5', ['user-2'], ['Moi']), 'user-2')).toBe('Paul Martin vous a retiré du groupe.');
  expect(systemNoteText(event('member_left', 'user-5', [], []), 'user-2')).toBe('Paul Martin a quitté le groupe.');
  expect(systemNoteText(event('member_left', 'user-2', [], []), 'user-2')).toBe('Vous avez quitté le groupe.');
  expect(systemNoteText({ action: 'member_removed', actorId: 'user-9', userIds: ['user-3'], userNames: [] }, 'user-2')).toBe('Un ancien membre a retiré un membre du groupe.');
  expect(joinNames(['A', 'B', 'C'])).toBe('A, B et C');
});

it('MAIR-1165 centres the note in the thread', () => {
  render(<SystemNote message={{ id: 1, content: '', kind: 'system', sentAt: '10:02', systemEvent: event('member_left', 'user-5', [], []) }} currentUserId="user-2" />);
  expect(screen.getByText('Paul Martin a quitté le groupe.')).toBeVisible();
  expect(document.querySelector('[data-system-note]')).toHaveClass('justify-center');
  render(<SystemNote message={{ id: 2, content: '', kind: 'system' }} />);
  expect(screen.getByText('La conversation a changé.')).toBeVisible();
});
