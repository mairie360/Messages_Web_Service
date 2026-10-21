import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ user: { name: 'Agent' }, isAdmin: false }), logoutAndReload: vi.fn() }));
vi.mock('@/lib/navigation', () => ({ getActiveFrontHrefs: () => ({ messages: '/' }) }));
const controller = { streamState: 'idle', retryReception: vi.fn(), loading: true, currentUser: null, bootstrapError: null, retryBootstrap: vi.fn(), deletingConversation: null, error: null, feedback: null, dismissFeedback: vi.fn(), syncError: null, selectionPending: false, threadPlaceholder: '', activeConversationId: undefined, showConversationList: true, displayedConversations: [], contacts: [], displayedMessages: [], mentionOptions: [], businessReferences: [], hasConfirmedThread: false, loadConversationMessages: vi.fn(), loadContacts: vi.fn(), handleSendMessage: vi.fn(), hasConfirmedMessages: false, handleReadVisibleMessages: vi.fn(), handleNewMessageSend: vi.fn(), handleCreateGroup: vi.fn(), handleConversationDelete: vi.fn(), toggleConversationList: vi.fn() } as never;

import { MessagesWorkspace } from './MessagesWorkspace';

describe('MessagesWorkspace', () => {
  it('shows the bootstrap state while loading, then the unavailable wording with the error', () => {
    const { rerender } = render(<MessagesWorkspace {...(controller as unknown as React.ComponentProps<typeof MessagesWorkspace>)} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Chargement de la messagerie' })).toBeInTheDocument();
    rerender(<MessagesWorkspace {...(controller as unknown as React.ComponentProps<typeof MessagesWorkspace>)} loading={false} bootstrapError="BFF injoignable" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Messagerie indisponible' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('BFF injoignable');
  });
});
