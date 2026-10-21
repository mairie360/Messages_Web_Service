import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextReferenceBar } from '@/components/messaging/thread/ContextReferenceBar';
import { ConversationComposers } from '@/components/messaging/thread/ConversationComposers';
import { MessageThread } from '@/components/messaging/thread/MessageThread';
import { ReadFailureAlert } from '@/components/messaging/thread/ReadFailureAlert';
import { UnreadNotificationsBar } from '@/components/messaging/thread/UnreadNotificationsBar';
import { defaultMessagingConversations } from '../messaging-fixtures';

const [marie, pierre] = defaultMessagingConversations;
const threadProps = { emptyStateLabel: 'Choisissez un fil', mentionOptions: [], businessReferenceOptions: [] };

describe('MAIR-608 thread sub-components', () => {
  it('MessageThread distinguishes no conversation, an empty one and its messages, and forwards its ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(<MessageThread ref={ref} hasConversation={false} messages={[]} {...threadProps} />);
    expect(screen.getByText('Choisissez un fil')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[]} {...threadProps} />);
    expect(screen.getByText('Aucun message dans cette conversation.')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[{ id: 'm1', content: 'Bonjour', direction: 'incoming' }]} {...threadProps} />);
    expect(screen.getByText('Bonjour').closest('[data-messaging-message-id="m1"]')).not.toBeNull();
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('UnreadNotificationsBar pluralises the count and opens the first unread thread', async () => {
    const onOpen = vi.fn();
    const { rerender } = render(<UnreadNotificationsBar count={1} onOpen={onOpen} />);
    expect(screen.getByRole('status', { name: 'Notifications de messagerie' })).toHaveTextContent('1 notification non lue');
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<UnreadNotificationsBar count={3} firstUnreadConversation={marie} onOpen={onOpen} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 notifications non lues');
    await userEvent.click(screen.getByRole('button', { name: 'Voir Marie Dubois' }));
    expect(onOpen).toHaveBeenCalledWith(marie);
  });

  it('ReadFailureAlert announces the failure', () => {
    render(<ReadFailureAlert message="Lecture impossible" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Lecture impossible');
  });

  it('ContextReferenceBar names the linked item and opens it only when allowed', async () => {
    const reference = { id: 't1', kind: 'task' as const, title: 'Valider le budget' };
    const onOpen = vi.fn();
    const { rerender } = render(<ContextReferenceBar reference={reference} />);
    expect(screen.getByLabelText('Message contextuel')).toHaveTextContent('Tâche : Valider le budget');
    expect(screen.queryByRole('button', { name: 'Ouvrir' })).toBeNull();
    rerender(<ContextReferenceBar reference={reference} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(onOpen).toHaveBeenCalledWith(reference);
  });

  it('ConversationComposers keeps a visited draft per thread and sends it to its own conversation', async () => {
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

  it('ConversationComposers renders one disabled composer without an active thread', () => {
    render(<ConversationComposers conversations={[marie]} activeConversation={null} mentionOptions={[]} businessReferenceOptions={[]} />);
    expect(screen.getByRole('textbox', { name: 'Écrire un message' })).toBeDisabled();
  });
});
