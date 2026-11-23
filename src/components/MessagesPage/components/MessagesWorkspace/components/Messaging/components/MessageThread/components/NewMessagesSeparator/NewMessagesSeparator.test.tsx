import { it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { NewMessagesSeparator } from './NewMessagesSeparator';

it('MAIR-1160 is a lib Divider named « Nouveaux messages »', () => {
  render(<NewMessagesSeparator />);
  const separator = screen.getByRole('separator', { name: 'Nouveaux messages' });
  expect(separator).toHaveAttribute('data-m360-component', expect.stringContaining('Divider'));
});
