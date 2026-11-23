import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderMembers } from './HeaderMembers';

it('MAIR-1165 is one button naming the size of the group that opens the member management', async () => {
  const onManage = vi.fn();
  render(<HeaderMembers members={[{ id: 1, name: 'Sophie Leroy', isAdmin: true }, { id: 2, name: 'Paul Martin', isAdmin: false }]} count={6} onManage={onManage} />);
  await userEvent.click(screen.getByRole('button', { name: '6 membres, gérer les membres' }));
  expect(onManage).toHaveBeenCalled();
});
