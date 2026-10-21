import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MessagingModalFrame } from '@/components/messaging/MessagingModalFrame';

it('names its dialog and keeps form submission separate from explicit closing', async () => {
  const onClose = vi.fn(); const onSubmit = vi.fn(event => event.preventDefault());
  const { container } = render(<MessagingModalFrame title="Nouveau message" subtitle="Message direct" titleId="title" subtitleId="subtitle" onClose={onClose} onSubmit={onSubmit} footer={<button type="submit">Envoyer</button>}><label>Message<input /></label></MessagingModalFrame>);
  expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toHaveAttribute('aria-describedby', 'subtitle'); await userEvent.click(screen.getByRole('button', { name: 'Envoyer' })); expect(onSubmit).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Fermer' })); expect(onClose).toHaveBeenCalledTimes(1); expect((await axe(container)).violations).toEqual([]);
});
