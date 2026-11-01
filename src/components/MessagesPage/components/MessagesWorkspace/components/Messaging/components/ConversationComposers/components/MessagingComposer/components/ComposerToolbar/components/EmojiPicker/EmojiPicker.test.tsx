import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EmojiPicker } from './EmojiPicker';

describe('EmojiPicker', () => {
  it('offers the eight system emojis', async () => {
    const onPick = vi.fn();
    render(<EmojiPicker disabled={false} onPick={onPick} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter 🎉' })); expect(onPick).toHaveBeenCalledWith('🎉');
  });
});
