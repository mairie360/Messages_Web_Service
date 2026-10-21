import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingMessageBubble } from '@/components/messaging/MessagingMessageBubble';
import { axe } from 'jest-axe';
it('delegates downloads and preserves the message when a download is refused', async () => {
  const attachment = { id: 'file1', name: 'conseil.pdf' }; const message = { id: 1, content: 'Document reçu', attachments: [attachment] }; const onAttachmentDownload = vi.fn().mockRejectedValue(new Error('Téléchargement refusé')); const { container } = render(<MessagingMessageBubble message={message} onAttachmentDownload={onAttachmentDownload} />); await userEvent.click(screen.getByRole('button', { name: /conseil.pdf.*Télécharger/ })); expect(await screen.findByText('Téléchargement refusé')).toBeVisible(); expect(onAttachmentDownload).toHaveBeenCalledWith(attachment, message); expect(screen.getByText('Document reçu')).toBeVisible(); expect((await axe(container)).violations).toEqual([]);
});
