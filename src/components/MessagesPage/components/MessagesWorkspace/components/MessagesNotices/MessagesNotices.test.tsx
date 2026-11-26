import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesNotices } from './MessagesNotices';

const base = { deletingConversation: false, error: null, syncError: null, pendingText: null };

describe('MessagesNotices', () => {
  it('MAIR-1225 RGAA 7.5 keeps only the empty live region without a status or an error', () => {
    const { container } = render(<MessagesNotices {...base} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    expect(container.children).toHaveLength(1);
  });

  it('MAIR-1225 RGAA 7.5 writes the pending operations as info Alerts into the live region mounted before them', () => {
    const { rerender } = render(<MessagesNotices {...base} />);
    const region = screen.getByRole('status');
    rerender(<MessagesNotices {...base} deletingConversation pendingText="Ouverture de la conversation…" />);
    // Same region node: it existed before its text, so the text is announced.
    expect(screen.getByRole('status')).toBe(region);
    const alerts = [...region.querySelectorAll('[data-m360-component~="Alert"]')];
    expect(alerts.map((node) => node.textContent)).toEqual(['Suppression de la conversation en cours…', 'Ouverture de la conversation…']);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('MAIR-854 renders the action error as a closable ErrorAlert and the sync error as a lasting one', async () => {
    const onDismissError = vi.fn();
    const { container } = render(<MessagesNotices {...base} error="Le message n’a pas pu être envoyé." onDismissError={onDismissError} syncError="La synchronisation des conversations est momentanément indisponible." />);
    const alerts = screen.getAllByRole('alert');
    expect(alerts.map((node) => node.textContent)).toEqual([
      expect.stringContaining('Le message n’a pas pu être envoyé.'),
      expect.stringContaining('La synchronisation des conversations est momentanément indisponible.'),
    ]);
    for (const alert of alerts) expect(alert.getAttribute('data-m360-component')).toContain('ErrorAlert');
    const close = screen.getAllByRole('button', { name: 'Fermer le message' });
    expect(close).toHaveLength(1);
    await userEvent.click(close[0]);
    expect(onDismissError).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.messages-error')).toBeNull();
  });
});
