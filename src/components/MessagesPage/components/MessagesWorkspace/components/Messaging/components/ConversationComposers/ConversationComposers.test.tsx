import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { ConversationComposers } from './ConversationComposers';

describe('ConversationComposers', () => {
  it('MAIR-1253 asks to write to the open conversation, then shows file / mention / link / emoji actions and the « Envoyer » button', () => {
    render(<ConversationComposers conversations={[marie, pierre]} mentionOptions={[]} businessReferenceOptions={[]} onSendMessage={vi.fn()} activeConversation={marie} />);
    const input = screen.getByRole('combobox', { name: 'Écrire un message' });
    expect(input).toHaveAttribute('placeholder', 'Écrire un message à Marie Dubois… (@ pour mentionner, # pour lier un élément)');
    const form = input.closest('form')!;
    const buttons = [...form.querySelectorAll('button')].map(button => button.getAttribute('aria-label') ?? button.textContent);
    expect(buttons).toEqual(['Joindre un fichier', 'Mentionner une personne', 'Lier un élément', 'Insérer un emoji', 'Envoyer']);
    const send = screen.getByRole('button', { name: 'Envoyer' });
    expect(send).toHaveTextContent('Envoyer');
    expect(send).toHaveAttribute('type', 'submit');
    expect(send).toBeDisabled();
    expect(input.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps a visited draft per thread and sends it to its own conversation', async () => {
    const onSendMessage = vi.fn();
    const props = { conversations: [marie, pierre], mentionOptions: [], businessReferenceOptions: [], onSendMessage };
    const { rerender } = render(<ConversationComposers {...props} activeConversation={marie} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Écrire un message' }), 'Brouillon Marie');
    rerender(<ConversationComposers {...props} activeConversation={pierre} />);
    expect(screen.getByRole('combobox', { name: 'Écrire un message' })).toHaveValue('');
    rerender(<ConversationComposers {...props} activeConversation={marie} />);
    expect(screen.getByRole('combobox', { name: 'Écrire un message' })).toHaveValue('Brouillon Marie');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(onSendMessage).toHaveBeenCalledWith(marie.id, 'Brouillon Marie', [], [], []);
  });
  it('renders one disabled composer without an active thread', () => {
    render(<ConversationComposers conversations={[marie]} activeConversation={null} mentionOptions={[]} businessReferenceOptions={[]} />);
    expect(screen.getByRole('combobox', { name: 'Écrire un message' })).toBeDisabled();
  });
});
