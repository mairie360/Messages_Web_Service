import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesBootstrapState } from './MessagesBootstrapState';

describe('MessagesBootstrapState', () => {
  it('MAIR-847 shows the loading state with a skeleton and a disabled « Chargement en cours… » button', () => {
    const onRetry = vi.fn();
    const { container } = render(<MessagesBootstrapState loading onRetry={onRetry} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Chargement de la messagerie' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Les conversations sont en cours de chargement.');
    const button = screen.getByRole('button', { name: /Chargement en cours…/ });
    expect(button).toBeDisabled();
    expect(container.querySelector('[data-m360-component~="Card"]')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[data-m360-component~="Skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('MAIR-847 shows the unavailable state with the lib ErrorAlert and a working « Réessayer »', async () => {
    const onRetry = vi.fn();
    const { container } = render(<MessagesBootstrapState loading={false} error="La messagerie est en maintenance" onRetry={onRetry} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Messagerie indisponible' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('La messagerie est en maintenance');
    expect(container.querySelector('[data-m360-component~="ErrorAlert"]')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-m360-component~="Skeleton"]')).toBeNull();
  });

  it('MAIR-847 hard-codes no colour', () => {
    const { container } = render(<MessagesBootstrapState loading={false} error="Refus" onRetry={() => {}} />);
    expect(container.innerHTML).not.toMatch(/bg-white|bg-gray-|text-white|#[0-9a-f]{3,6}/i);
  });
});
