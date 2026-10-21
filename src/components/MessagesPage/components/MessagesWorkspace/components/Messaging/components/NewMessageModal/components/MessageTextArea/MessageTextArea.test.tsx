import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MessageTextArea } from './MessageTextArea';

describe('MessageTextArea', () => {
  it('is labelled and reports its value', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MessageTextArea label="Message" placeholder="Tapez" value="" disabled={false} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'A'); expect(onChange).toHaveBeenCalledWith('A');
    rerender(<MessageTextArea label="Message" placeholder="Tapez" value="A" disabled onChange={onChange} />);
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();
  });
});
