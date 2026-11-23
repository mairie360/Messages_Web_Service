import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesReceptionDelayed } from './MessagesReceptionDelayed';

describe('MessagesReceptionDelayed', () => {
  it.each(['connected', 'polling', 'connecting'] as const)('MAIR-1161 shows nothing while the reception is %s', (state) => {
    const { container } = render(<MessagesReceptionDelayed state={state} onRetry={() => {}} />);
    expect(container.textContent).toBe('');
    expect(screen.queryByText(/Réception automatique active|Actualisation automatique/)).toBeNull();
    expect(container.firstElementChild).toHaveAttribute('aria-live', 'polite');
  });

  it('MAIR-1161 shows a small lib warning Alert once the connection is lost, announced without taking the focus', async () => {
    const onRetry = vi.fn();
    const { container, rerender } = render(<><button type="button">Ailleurs</button><MessagesReceptionDelayed state="connected" onRetry={onRetry} /></>);
    const elsewhere = screen.getByRole('button', { name: 'Ailleurs' }); elsewhere.focus();
    rerender(<><button type="button">Ailleurs</button><MessagesReceptionDelayed state="offline" onRetry={onRetry} /></>);
    const alert = container.querySelector('[data-m360-component~="Alert"]')!;
    expect(alert).toHaveAttribute('data-tone', 'warning');
    expect(alert).toHaveAttribute('data-size', 's');
    expect(alert).toHaveTextContent('Réception des messages retardée');
    expect(alert.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ailleurs' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer la réception' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<><button type="button">Ailleurs</button><MessagesReceptionDelayed state="connected" onRetry={onRetry} /></>);
    expect(container.querySelector('[data-m360-component~="Alert"]')).toBeNull();
  });
});
