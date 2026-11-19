import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceptionStatus } from './ReceptionStatus';

describe('ReceptionStatus', () => {
  it.each([
    ['connected', 'Réception automatique active.', 'success'],
    ['polling', 'Actualisation automatique active.', 'info'],
    ['connecting', 'Connexion à la réception automatique…', 'neutral'],
    ['offline', 'Réception automatique retardée.', 'warning'],
  ] as const)('MAIR-860 renders the %s state as a lib StatusPill', (state, label, tone) => {
    const { container } = render(<ReceptionStatus state={state} onRetry={() => {}} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    const pill = container.querySelector('[data-m360-component~="StatusPill"]');
    expect(pill).toHaveTextContent(label);
    expect(pill).toHaveAttribute('data-tone', tone);
  });

  it('MAIR-860 offers « Réessayer la réception » only while delayed, as a lib Button with a 44 px target', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ReceptionStatus state="connected" onRetry={onRetry} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ReceptionStatus state="offline" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Réessayer la réception' });
    expect(button.getAttribute('data-m360-component')).toContain('Button');
    expect(button.className).toContain('min-h-11');
    await userEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
