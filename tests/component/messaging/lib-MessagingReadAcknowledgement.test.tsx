import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Messaging } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging';

const conversations = [
  { id: 'chat-a', name: 'Service A', unreadCount: 3 },
  { id: 'chat-b', name: 'Service B', unreadCount: 1 },
];
const messages = [
  { id: 'message-1', conversationId: 'chat-a', content: 'Premier message visible' },
  { id: 'message-2', conversationId: 'chat-a', content: 'Message sous la zone visible' },
  { id: 'message-b', conversationId: 'chat-b', content: 'Message du service B' },
];
const bounds = (top: number, bottom: number) => ({
  top, bottom, left: 0, right: 600, x: 0, y: top,
  width: 600, height: bottom - top, toJSON() { return {}; },
});

function setVisibleGeometry() {
  const first = screen.getByText('Premier message visible').closest('[data-messaging-message-id]')!;
  const second = screen.getByText('Message sous la zone visible').closest('[data-messaging-message-id]')!;
  const region = first.parentElement!;
  vi.spyOn(region, 'getBoundingClientRect').mockReturnValue(bounds(100, 400));
  vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(bounds(120, 190));
  vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(bounds(410, 480));
  return { first, second, region };
}

async function requestRead() {
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  fireEvent.click(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' }));
}

beforeEach(() => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => vi.restoreAllMocks());

it('offers an explicit command and reports only the last geometrically visible message, without clearing counts', async () => {
  const onReadVisibleMessages = vi.fn(() => true);
  const props = { onReadVisibleMessages };
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
  await requestRead();
  // Geometry is read in the next frame after the menu closes.
  setVisibleGeometry();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(
    conversations[0], expect.objectContaining({ id: 'message-1' }),
  ));
  expect(screen.queryByText('Message du service B')).not.toBeInTheDocument();
  expect(screen.getByText('4 notifications non lues')).toBeInTheDocument();
});

it('keeps the existing actions without a read callback', () => {
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  expect(screen.getByRole('button', { name: 'Supprimer la conversation' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Marquer les messages affichés comme lus' })).not.toBeInTheDocument();
});

it('reports no message when the document is hidden', async () => {
  const onReadVisibleMessages = vi.fn();
  const props = { onReadVisibleMessages };
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  setVisibleGeometry();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(conversations[0], null));
});

it.each(['hidden', 'inert', 'aria-hidden'])('reports no message from a %s thread even with nonzero test geometry', async attribute => {
  const onReadVisibleMessages = vi.fn();
  const props = { onReadVisibleMessages };
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  const { region } = setVisibleGeometry();
  region.parentElement!.setAttribute(attribute, attribute === 'aria-hidden' ? 'true' : '');
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(conversations[0], null));
});

it('respects ancestor clipping and reports the last visible message after a scroll', async () => {
  const onReadVisibleMessages = vi.fn();
  const props = { onReadVisibleMessages };
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  const { first, second, region } = setVisibleGeometry();
  vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(bounds(20, 90));
  vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(bounds(330, 390));
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenLastCalledWith(
    conversations[0], expect.objectContaining({ id: 'message-2' }),
  ));
  await requestRead();
  const ancestor = region.parentElement!;
  ancestor.style.overflowY = 'hidden';
  vi.spyOn(ancestor, 'getBoundingClientRect').mockReturnValue(bounds(100, 300));
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenLastCalledWith(conversations[0], null));
});

it('ignores a menu command when its conversation changes before the visibility frame', async () => {
  const onReadVisibleMessages = vi.fn();
  const props = { onReadVisibleMessages };
  const { rerender } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  rerender(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-b"
    onConversationDelete={vi.fn()} {...props} />);
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
});

it('keeps a pending acknowledgement single-flight even if the menu is opened again', async () => {
  let finish!: () => void;
  const onReadVisibleMessages = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const props = { onReadVisibleMessages };
  render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  setVisibleGeometry();
  await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
  const pending = screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' });
  expect(pending).toBeDisabled();
  fireEvent.click(pending);
  expect(onReadVisibleMessages).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByRole('button', { name: 'Marquer les messages affichés comme lus' })).toBeEnabled();
});

it('does not invoke a consumer after unmount while the visibility frame is pending', async () => {
  const onReadVisibleMessages = vi.fn();
  const props = { onReadVisibleMessages };
  const { unmount } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  unmount();
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
  expect(onReadVisibleMessages).not.toHaveBeenCalled();
});

it('keeps a refused command attached to its conversation and never clears unread counts', async () => {
  const onReadVisibleMessages = vi.fn(() => false);
  const props = { onReadVisibleMessages };
  const { rerender } = render(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-a"
    onConversationDelete={vi.fn()} {...props} />);
  await requestRead();
  setVisibleGeometry();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('n’ont pas pu être marqués comme lus'));
  expect(screen.getByText('4 notifications non lues')).toBeInTheDocument();
  rerender(<Messaging conversations={conversations} messages={messages} activeConversationId="chat-b"
    onConversationDelete={vi.fn()} {...props} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(onReadVisibleMessages).toHaveBeenCalledTimes(1);
});
