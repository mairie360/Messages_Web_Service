import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phone, Search } from 'lucide-react';

import { HeaderIconButton } from './HeaderIconButton';

describe('HeaderIconButton', () => {
  it('MAIR-1158 is a lib icon button named by its label and described by its tooltip', async () => {
    const onClick = vi.fn();
    render(<HeaderIconButton label="Rechercher dans la conversation" icon={Search} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Rechercher dans la conversation' });
    expect(button).toHaveAttribute('data-m360-component', expect.stringContaining('IconButton'));
    expect(button.querySelector('svg')).not.toBeNull();
    await userEvent.click(button); expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Rechercher dans la conversation');
    expect(button).toHaveAccessibleDescription('Rechercher dans la conversation');
  });

  it('MAIR-1158 announces an unavailable action as disabled, keeps it focusable for its tooltip and ignores clicks', async () => {
    const onClick = vi.fn();
    render(<HeaderIconButton label="Appeler" tooltip="Appeler · bientôt disponible" icon={Phone} unavailable onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Appeler' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.tab(); expect(button).toHaveFocus();
    expect(button).toHaveAccessibleDescription('Appeler · bientôt disponible');
    await userEvent.click(button); expect(onClick).not.toHaveBeenCalled();
  });
});
