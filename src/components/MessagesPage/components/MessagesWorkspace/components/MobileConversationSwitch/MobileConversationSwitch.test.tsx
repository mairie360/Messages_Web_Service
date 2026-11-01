import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MobileConversationSwitch } from './MobileConversationSwitch';

describe('MobileConversationSwitch', () => {
  it('names the pane it leads to and toggles', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<MobileConversationSwitch showConversationList onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Retour à la conversation', pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button')); expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<MobileConversationSwitch showConversationList={false} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Voir les conversations', pressed: false })).toBeInTheDocument();
  });
});
