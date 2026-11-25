import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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
    // MAIR-865: the lib ToastProvider also mounts an empty hidden role="alert" region.
    expect(screen.getAllByRole('alert').filter((node) => !node.closest('[data-m360-component~="ToastProvider"]')).map((node) => node.textContent)).toEqual([expect.stringContaining('BFF injoignable')]);
  });

  // The prod RGAA gate clicked « + », the emoji and mention buttons of the server-rendered page before
  // React had hydrated it, so the clicks did nothing; the states now wait for this marker first.
  it('MAIR-1204: marks the module stack as hydrated only once React runs in the browser', () => {
    const ready = { ...(controller as unknown as React.ComponentProps<typeof MessagesWorkspace>), loading: false, bootstrapError: null };
    expect(renderToString(<MessagesWorkspace {...ready} />)).not.toContain('data-hydrated');
    const { container } = render(<MessagesWorkspace {...ready} />);
    expect(container.ownerDocument.querySelector('.messages-module-stack')).toHaveAttribute('data-hydrated', 'true');
  });
});
