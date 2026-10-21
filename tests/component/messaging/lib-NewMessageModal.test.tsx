import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewMessageModal } from '@/components/messaging/NewMessageModal';
import { axe } from 'jest-axe';
it('sends only after an actual recipient and message are supplied', async () => {
  const user = userEvent.setup(); const onSendMessage = vi.fn().mockResolvedValue(true); const { container } = render(<NewMessageModal isOpen contacts={[{ id: 1, name: 'Anne Marie' }]} onCancel={vi.fn()} onSendMessage={onSendMessage} />); expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled(); await user.selectOptions(screen.getByLabelText('Destinataire'), '1'); await user.type(screen.getByLabelText('Message'), 'Bonjour'); await user.click(screen.getByRole('button', { name: 'Envoyer' })); expect(onSendMessage).toHaveBeenCalledWith({ recipientId: 1, message: 'Bonjour' }); expect((await axe(container)).violations).toEqual([]);
});
