import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@mairie360/lib-components/primitives';
import { FeedbackToast } from './FeedbackToast';

// The provider also mirrors each message in a hidden live region: read the visible toast cards.
const toastCards = () => [...document.querySelectorAll<HTMLElement>('[data-m360-component~="Toast"]')];
const findToast = async (text: string) => {
  await waitFor(() => expect(toastCards().some((card) => card.textContent?.includes(text))).toBe(true));
  return toastCards().find((card) => card.textContent?.includes(text))!;
};

function Harness({ initial, onDismiss }: { initial: string | null; onDismiss: () => void }) {
  const [feedback, setFeedback] = useState(initial);
  return (
    <ToastProvider regionLabel="Notifications de la messagerie">
      <p data-testid="module">Module</p>
      <FeedbackToast feedback={feedback} dismissFeedback={() => { onDismiss(); setFeedback(null); }} />
    </ToastProvider>
  );
}

describe('FeedbackToast', () => {
  it('MAIR-865 floats the confirmation in the lib toast region, without a title, and clears the feedback', async () => {
    const onDismiss = vi.fn();
    const { container } = render(<Harness initial="Message direct créé." onDismiss={onDismiss} />);
    const card = await findToast('Message direct créé.');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(card.querySelector('p.font-semibold')).toBeNull();
    // The toast sits in the provider's region, outside the page flow: the module keeps its place.
    const region = container.querySelector('[aria-label="Notifications de la messagerie"]');
    expect(region).not.toBeNull();
    expect(region?.contains(card)).toBe(true);
    expect(region?.contains(screen.getByTestId('module'))).toBe(false);
  });

  it('MAIR-865 closes on click', async () => {
    render(<Harness initial="Groupe « Équipe » créé." onDismiss={() => {}} />);
    const card = await findToast('Groupe « Équipe » créé.');
    await userEvent.click(card.querySelector<HTMLButtonElement>('button[aria-label="Fermer la notification"]')!);
    await waitFor(() => expect(toastCards()).toHaveLength(0));
  });

  it('MAIR-865 closes with the keyboard', async () => {
    render(<Harness initial="Conversation « Projet » supprimée." onDismiss={() => {}} />);
    const card = await findToast('Conversation « Projet » supprimée.');
    card.querySelector<HTMLButtonElement>('button[aria-label="Fermer la notification"]')!.focus();
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    await waitFor(() => expect(toastCards()).toHaveLength(0));
  });

  it('MAIR-865 shows nothing without feedback', () => {
    const onDismiss = vi.fn();
    render(<Harness initial={null} onDismiss={onDismiss} />);
    expect(screen.queryByRole('button', { name: 'Fermer la notification' })).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
