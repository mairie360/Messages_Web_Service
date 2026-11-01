import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingComposer } from './MessagingComposer';
import { axe } from 'jest-axe';
it('retains a refused draft and clears it only after an accepted explicit send', async () => {
  const user = userEvent.setup(); const onSendMessage = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true); const { container } = render(<MessagingComposer onSendMessage={onSendMessage} />); const input = screen.getByPlaceholderText('Tapez votre message...'); await user.type(input, 'Bonjour'); await user.click(screen.getByRole('button', { name: 'Envoyer' })); await waitFor(() => expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled()); expect(input).toHaveValue('Bonjour'); await user.click(screen.getByRole('button', { name: 'Envoyer' })); await waitFor(() => expect(input).toHaveValue('')); expect(onSendMessage.mock.calls.map(call => call[0])).toEqual(['Bonjour', 'Bonjour']); expect((await axe(container)).violations).toEqual([]);
});
