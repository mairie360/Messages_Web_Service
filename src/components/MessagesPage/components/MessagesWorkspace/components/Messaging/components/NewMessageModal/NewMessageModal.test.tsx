import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewMessageModal } from './NewMessageModal';
import { axe } from 'jest-axe';
it('sends only after an actual recipient and message are supplied', async () => {
  const user = userEvent.setup(); const onSendMessage = vi.fn().mockResolvedValue(true); const { container } = render(<NewMessageModal isOpen contacts={[{ id: 1, name: 'Anne Marie' }]} onCancel={vi.fn()} onSendMessage={onSendMessage} />); expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled(); await user.selectOptions(screen.getByLabelText('Destinataire'), '1'); await user.type(screen.getByLabelText('Message'), 'Bonjour'); await user.click(screen.getByRole('button', { name: 'Envoyer' })); expect(onSendMessage).toHaveBeenCalledWith({ recipientId: 1, message: 'Bonjour' }); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-878 keeps « Envoyer » (lib SendButton with its icon) disabled until a recipient and a message are given', async () => {
  const user = userEvent.setup();
  render(<NewMessageModal isOpen contacts={[{ id: 1, name: 'Anne Marie' }]} onCancel={vi.fn()} onSendMessage={vi.fn()} />);
  const send = screen.getByRole('button', { name: 'Envoyer' });
  expect(send.querySelector('svg[data-m360-component="Icon"]')).not.toBeNull();
  expect(send).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Destinataire'), '1');
  expect(send).toBeDisabled();
  await user.type(screen.getByLabelText('Message'), '   ');
  expect(send).toBeDisabled();
  await user.type(screen.getByLabelText('Message'), 'Bonjour');
  expect(send).toBeEnabled();
});

it('MAIR-878 shows a BFF refusal as an ErrorAlert above the form, stays open and keeps the input', async () => {
  const user = userEvent.setup(); const onCancel = vi.fn();
  const onSendMessage = vi.fn().mockRejectedValueOnce(new Error('Destinataire inconnu')).mockResolvedValueOnce(false);
  render(<NewMessageModal isOpen contacts={[{ id: 1, name: 'Anne Marie' }]} onCancel={onCancel} onSendMessage={onSendMessage} />);
  await user.selectOptions(screen.getByLabelText('Destinataire'), '1');
  await user.type(screen.getByLabelText('Message'), 'Bonjour');
  const sendAndExpectRefusal = async () => {
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    const alert = await screen.findByRole('alert');
    expect(alert.getAttribute('data-m360-component')).toContain('ErrorAlert');
    expect(alert).toHaveTextContent('Le message n’a pas pu être envoyé. Vos saisies sont conservées ; vous pouvez réessayer.');
    expect(screen.getByLabelText('Destinataire')).toHaveValue('1');
    expect(screen.getByLabelText('Message')).toHaveValue('Bonjour');
  };
  await sendAndExpectRefusal(); // rejected promise
  await sendAndExpectRefusal(); // resolved false
  expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeVisible();
  expect(onCancel).not.toHaveBeenCalled();
});

it('MAIR-878 ignores Escape and « Annuler » while the message is being sent', async () => {
  const user = userEvent.setup(); const onCancel = vi.fn();
  let resolve: (value: boolean) => void = () => {};
  const onSendMessage = vi.fn(() => new Promise<boolean>((done) => { resolve = done; }));
  render(<NewMessageModal isOpen contacts={[{ id: 1, name: 'Anne Marie' }]} onCancel={onCancel} onSendMessage={onSendMessage} />);
  await user.selectOptions(screen.getByLabelText('Destinataire'), '1');
  await user.type(screen.getByLabelText('Message'), 'Bonjour');
  await user.click(screen.getByRole('button', { name: 'Envoyer' }));
  await user.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  expect(onCancel).not.toHaveBeenCalled();
  await act(async () => { resolve(true); });
  await user.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(1);
});
