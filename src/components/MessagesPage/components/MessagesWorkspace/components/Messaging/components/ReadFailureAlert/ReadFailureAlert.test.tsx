import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { ReadFailureAlert } from './ReadFailureAlert';

describe('ReadFailureAlert', () => {
  it('announces the failure', () => {
    render(<ReadFailureAlert message="Lecture impossible" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Lecture impossible');
  });
});
