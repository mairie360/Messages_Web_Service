import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeaderIconButton } from './HeaderIconButton';

describe('HeaderIconButton', () => {
  it('is named by its label', async () => {
    const onClick = vi.fn();
    render(<HeaderIconButton label="Appeler" onClick={onClick}><span /></HeaderIconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Appeler' })); expect(onClick).toHaveBeenCalledTimes(1);
  });
});
