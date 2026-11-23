import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MessageReactions, reactionLabel, reactionNames } from './MessageReactions';

const reactions = [
  { emoji: '👍', count: 3, reactedByMe: true, userNames: ['Moi', 'Sophie Leroy'] },
  { emoji: '🎉', count: 1, reactedByMe: false, userNames: ['Paul Martin'] },
];

it('MAIR-1170 shows one toggle pill per emoji, mine pressed, with the names in the tooltip', async () => {
  const onToggle = vi.fn(); const onAdd = vi.fn();
  const { container, rerender } = render(<MessageReactions reactions={reactions} outgoing={false} onToggle={onToggle} onAdd={onAdd} />);
  const mine = screen.getByRole('button', { name: '👍 3, dont vous' });
  expect(mine).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '🎉 1' })).toHaveAttribute('aria-pressed', 'false');
  expect(mine).toHaveAccessibleDescription('Moi, Sophie Leroy et 1 autre');
  fireEvent.click(mine);
  expect(onToggle).toHaveBeenCalledWith(reactions[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter une réaction' }));
  expect(onAdd).toHaveBeenCalled();
  expect((await axe(container)).violations).toEqual([]);
  rerender(<MessageReactions reactions={[]} outgoing onToggle={onToggle} />);
  expect(container.querySelector('[data-message-reactions]')).toBeNull();
});

it('MAIR-1170 words the label and the names', () => {
  expect(reactionLabel({ emoji: '👀', count: 2, reactedByMe: false, userNames: [] })).toBe('👀 2');
  expect(reactionNames({ emoji: '👀', count: 2, reactedByMe: false, userNames: [] })).toBe('2 agents');
  expect(reactionNames({ emoji: '👀', count: 1, reactedByMe: false, userNames: [] })).toBe('1 agent');
  expect(reactionNames({ emoji: '👀', count: 4, reactedByMe: false, userNames: ['A'] })).toBe('A et 3 autres');
});
