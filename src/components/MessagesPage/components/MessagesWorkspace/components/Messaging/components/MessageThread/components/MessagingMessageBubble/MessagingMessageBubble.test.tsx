import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingMessageBubble } from './MessagingMessageBubble';
import { axe } from 'jest-axe';
it('delegates downloads and preserves the message when a download is refused', async () => {
  const attachment = { id: 'file1', name: 'conseil.pdf' }; const message = { id: 1, content: 'Document reçu', attachments: [attachment] }; const onAttachmentDownload = vi.fn().mockRejectedValue(new Error('Téléchargement refusé')); const { container } = render(<MessagingMessageBubble message={message} onAttachmentDownload={onAttachmentDownload} />); await userEvent.click(screen.getByRole('button', { name: /conseil.pdf.*Télécharger/ })); expect(await screen.findByText('Téléchargement refusé')).toBeVisible(); expect(onAttachmentDownload).toHaveBeenCalledWith(attachment, message); expect(screen.getByText('Document reçu')).toBeVisible(); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-1159 draws my messages on the lib message-own tokens with the time above, right-aligned; received ones unchanged', async () => {
  const { container, rerender } = render(<MessagingMessageBubble message={{ id: 1, content: 'Envoyé par moi', direction: 'outgoing', sentAt: '10:42' }} />);
  const bubble = container.querySelector('[data-direction="outgoing"]')!;
  expect(bubble.className).toContain('bg-[var(--mairie-message-own-background)]');
  expect(bubble.className).toContain('text-[var(--mairie-message-own-on)]');
  expect(bubble.className).toContain('border-[var(--mairie-message-own-border)]');
  expect(bubble.className).not.toMatch(/#[0-9a-f]{3,6}|action-background/i);
  const time = screen.getByText('10:42');
  expect(time).toHaveClass('self-end', 'text-right');
  expect(time.compareDocumentPosition(bubble) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect((await axe(container)).violations).toEqual([]);
  rerender(<MessagingMessageBubble message={{ id: 2, content: 'Reçu', direction: 'incoming', sentAt: '10:43' }} />);
  const received = container.querySelector('[data-direction="incoming"]')!;
  expect(received.className).toContain('bg-[var(--mairie-surface)]'); expect(received.className).toContain('border-[var(--mairie-border)]');
  expect(screen.getByText('10:43')).not.toHaveClass('self-end');
});

it('MAIR-1225 shows « Message supprimé » only when the quote is flagged deleted, never because the quote is missing', () => {
  const { rerender } = render(<MessagingMessageBubble message={{ id: 2, content: 'Merci', direction: 'outgoing', citation: 1, quoted: { id: 1, authorName: 'Sophie', excerpt: 'Bonjour' } }} />);
  expect(screen.getByText('Bonjour')).toBeVisible();
  expect(screen.queryByText('Message supprimé')).toBeNull();
  rerender(<MessagingMessageBubble message={{ id: 2, content: 'Merci', direction: 'outgoing', citation: 1 }} />);
  expect(screen.queryByText('Message supprimé')).toBeNull();
  expect(screen.getByText('Message cité')).toBeVisible();
  rerender(<MessagingMessageBubble message={{ id: 2, content: 'Merci', direction: 'outgoing', citation: 1, quoted: { id: 1, deleted: true } }} />);
  expect(screen.getByText('Message supprimé')).toBeVisible();
});

it('MAIR-1225 overlays the actions on the message: the toolbar is out of the flow, so the thread keeps its height', async () => {
  const { container } = render(<MessagingMessageBubble message={{ id: 3, content: 'Bonjour', direction: 'incoming', sentAt: '10:00' }} onReply={vi.fn()} />);
  await userEvent.hover(screen.getByText('Bonjour'));
  const toolbar = screen.getByRole('toolbar', { name: 'Actions du message' });
  expect(toolbar).toHaveClass('absolute', 'top-0', '-translate-y-1/2', 'z-10');
  expect(toolbar.parentElement).toHaveClass('relative');
  expect(container.firstElementChild).toBe(toolbar.parentElement);
});
