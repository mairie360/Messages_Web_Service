import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberRow } from './MemberRow';

it('MAIR-1165 shows the service and the « Administrateur » badge, and « Retirer » for another member only', async () => {
  const onRemove = vi.fn();
  const member = { id: 'user-3', name: 'Sophie Leroy', department: 'Urbanisme', isAdmin: true };
  const { rerender } = render(<MemberRow member={member} self={false} onRemove={onRemove} />);
  expect(screen.getByText('Urbanisme')).toBeVisible();
  expect(screen.getByText('Administrateur')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Retirer Sophie Leroy du groupe' }));
  expect(onRemove).toHaveBeenCalledWith(member);
  rerender(<MemberRow member={member} self onRemove={onRemove} />);
  expect(screen.getByText('Sophie Leroy (vous)')).toBeVisible();
  expect(screen.queryByRole('button')).toBeNull();
});
