import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { ConversationComposers } from './ConversationComposers';

describe('ConversationComposers', () => {
  it('keeps a visited draft per thread and sends it to its own conversation', async () => {
    const onSendMessage = vi.fn();
    const props = { conversations: [marie, pierre], mentionOptions: [], businessReferenceOptions: [], onSendMessage };
    const { rerender } = render(<ConversationComposers {...props} activeConversation={marie} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Écrire un message' }), 'Brouillon Marie');
    rerender(<ConversationComposers {...props} activeConversation={pierre} />);
    expect(screen.getByRole('textbox', { name: 'Écrire un message' })).toHaveValue('');
    rerender(<ConversationComposers {...props} activeConversation={marie} />);
    expect(screen.getByRole('textbox', { name: 'Écrire un message' })).toHaveValue('Brouillon Marie');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(onSendMessage).toHaveBeenCalledWith(marie.id, 'Brouillon Marie', [], [], []);
  });
  it('renders one disabled composer without an active thread', () => {
    render(<ConversationComposers conversations={[marie]} activeConversation={null} mentionOptions={[]} businessReferenceOptions={[]} />);
    expect(screen.getByRole('textbox', { name: 'Écrire un message' })).toBeDisabled();
  });
});
