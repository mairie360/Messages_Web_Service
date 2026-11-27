import { it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { DaySeparator } from './DaySeparator';

it('MAIR-1253 shows the day of the messages that follow as a centred pill', () => {
  const { container } = render(<DaySeparator label="Aujourd’hui" />);
  expect(screen.getByText('Aujourd’hui')).toHaveAttribute('data-m360-component', expect.stringContaining('Text'));
  expect(container.firstElementChild).toHaveAttribute('data-day-separator', '');
});
