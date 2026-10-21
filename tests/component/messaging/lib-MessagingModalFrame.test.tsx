import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MessagingModalFrame } from '@/components/messaging/MessagingModalFrame';

const frame = (props: Partial<React.ComponentProps<typeof MessagingModalFrame>> = {}) => {
  const onClose = vi.fn(); const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const view = render(<MessagingModalFrame title="Nouveau message" subtitle="Message direct" formId="frame-form" onClose={onClose} onSubmit={onSubmit}
    footer={<button type="submit" form="frame-form">Envoyer</button>} {...props}><label>Message<input /></label></MessagingModalFrame>);
  return { ...view, onClose, onSubmit };
};

it('names its lib dialog and keeps form submission separate from explicit closing', async () => {
  const { container, onClose, onSubmit } = frame();
  const dialog = screen.getByRole('dialog', { name: 'Nouveau message' });
  expect(dialog).toHaveAccessibleDescription('Message direct');
  await userEvent.click(screen.getByRole('button', { name: 'Envoyer' })); expect(onSubmit).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Fermer' })); expect(onClose).toHaveBeenCalledTimes(1);
  expect((await axe(container)).violations).toEqual([]);
});

it('ignores the close button and Escape while a request is pending', async () => {
  const { onClose } = frame({ closeDisabled: true });
  await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
  await userEvent.keyboard('{Escape}');
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeInTheDocument();
});
