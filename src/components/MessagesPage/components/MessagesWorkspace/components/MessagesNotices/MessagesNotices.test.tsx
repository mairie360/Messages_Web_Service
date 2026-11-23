import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesNotices } from './MessagesNotices';

const base = { deletingConversation: false, error: null, syncError: null, pendingText: null };

describe('MessagesNotices', () => {
  it('MAIR-854 renders nothing without a status or an error', () => {
    const { container } = render(<MessagesNotices {...base} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('MAIR-854 renders the pending operations as info Alerts announced politely', () => {
    const { container } = render(<MessagesNotices {...base} deletingConversation pendingText="Ouverture de la conversation…" />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.map((node) => node.textContent)).toEqual(['Suppression de la conversation en cours…', 'Ouverture de la conversation…']);
    for (const status of statuses) expect(status).toHaveAttribute('data-m360-component', expect.stringContaining('Alert'));
    expect(container.querySelector('.messages-operation-status')).toBeNull();
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
