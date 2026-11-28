import { it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessagingContactAvatar } from './MessagingContactAvatar';
it('derives contact initials and exposes its presence label, while preserving meaningful image text', () => {
  const { rerender } = render(<MessagingContactAvatar name="Anne Marie" presence="online" />); expect(screen.getByText('AM')).toBeVisible(); expect(screen.getByLabelText('En ligne')).toBeInTheDocument(); rerender(<MessagingContactAvatar name="Anne Marie" src="/anne.png" />); expect(screen.getByRole('img', { name: 'Anne Marie' })).toBeInTheDocument();
});
it('MAIR-1253 a group shows the users icon on a raised disc instead of initials', () => {
  const { container } = render(<MessagingContactAvatar name="[TEST] Équipe voirie" group size="sm" />);
  const disc = container.querySelector('[data-group-avatar]') as HTMLElement;
  expect(disc).toHaveAttribute('aria-hidden', 'true');
  expect(disc.querySelector('svg')).not.toBeNull();
  expect(disc.style.width).toBe('var(--mairie-avatar-m)');
  expect(container.textContent).not.toMatch(/\[É|ÉV/);
});
it('MAIR-1253 a group with a photo keeps the photo', () => {
  render(<MessagingContactAvatar name="Conseil" group src="/conseil.png" />);
  expect(screen.getByRole('img', { name: 'Conseil' })).toBeInTheDocument();
});
