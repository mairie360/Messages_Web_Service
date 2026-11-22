import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Messaging } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging';

// MAIR-1163: « Marquer les messages comme lus » of « Plus d'actions » acknowledges up to the last message of the
// thread (the counters reach zero); the geometry of the visible messages is only used by the end-of-thread read of
// MAIR-1160 (`tests/messaging-visible-message.test.cjs`, `MessageThread.test.tsx`).
const conversations = [
  { id: 'chat-a', name: 'Service A', unreadCount: 3 },
  { id: 'chat-b', name: 'Service B', unreadCount: 1 },
];
const messages = [
  { id: 'message-1', conversationId: 'chat-a', content: 'Premier message visible' },
  { id: 'message-2', conversationId: 'chat-a', content: 'Message sous la zone visible' },
  { id: 'message-b', conversationId: 'chat-b', content: 'Message du service B' },
];
const READ = 'Marquer les messages comme lus';

function requestRead() {
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  fireEvent.click(screen.getByRole('menuitem', { name: READ }));
}

beforeEach(() => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => vi.restoreAllMocks());

it('acknowledges up to the last message of the open thread, without clearing counts itself', async () => {
  const onReadVisibleMessages = vi.fn(() => true);
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
  requestRead();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(
    conversations[0], expect.objectContaining({ id: 'message-2' }),
  ));
  expect(screen.queryByText('Message du service B')).not.toBeInTheDocument();
  // The counters change when the consumer updates the conversations.
  expect(document.querySelectorAll('[data-m360-component~="Counter"]')).toHaveLength(2);
});

it('keeps the existing actions without a read callback', () => {
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  expect(screen.getByRole('menuitem', { name: 'Supprimer la conversation' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: READ })).not.toBeInTheDocument();
});

it('ignores a menu command when its conversation changes before the next frame', async () => {
  const onReadVisibleMessages = vi.fn();
  const { rerender } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  rerender(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-b"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
});

it('keeps a pending acknowledgement single-flight even if the menu is opened again', async () => {
  let finish!: () => void;
  const onReadVisibleMessages = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  const pending = screen.getByRole('menuitem', { name: READ });
  expect(pending).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(pending);
  expect(onReadVisibleMessages).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByRole('menuitem', { name: READ })).not.toHaveAttribute('aria-disabled');
});

it('does not invoke a consumer after unmount while the frame is pending', async () => {
  const onReadVisibleMessages = vi.fn();
  const { unmount } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  unmount();
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
});

it('keeps a refused command attached to its conversation and never clears unread counts', async () => {
  const onReadVisibleMessages = vi.fn(() => false);
  const { rerender } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('n’ont pas pu être marqués comme lus'));
  expect(document.querySelectorAll('[data-m360-component~="Counter"]')).toHaveLength(2);
  rerender(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-b"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(onReadVisibleMessages).toHaveBeenCalledTimes(1);
});

it('shows the read failure when the consumer throws, then lets a new command through', async () => {
  const onReadVisibleMessages = vi.fn(() => { throw new Error('network'); });
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('n’ont pas pu être marqués comme lus'));
  requestRead();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledTimes(2));
});

it('acknowledges an empty thread without a last message', async () => {
  const onReadVisibleMessages = vi.fn(() => true);
  render(<Messaging conversations={conversations} messages={[]} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} onReadVisibleMessages={onReadVisibleMessages} />);
  requestRead();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(conversations[0], null));
});
