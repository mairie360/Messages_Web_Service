import { afterEach, describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataState } from '@mairie360/lib-components/primitives';
import { MessageThread } from './MessageThread';

const threadProps = { emptyStateLabel: 'Choisissez un fil', mentionOptions: [], businessReferenceOptions: [] };

describe('MessageThread', () => {
  it('distinguishes no conversation, an empty one and its messages, and forwards its ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(<MessageThread ref={ref} hasConversation={false} messages={[]} {...threadProps} />);
    expect(screen.getByText('Choisissez un fil')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[]} {...threadProps} />);
    expect(screen.getByText('Aucun message dans cette conversation.')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[{ id: 'm1', content: 'Bonjour', direction: 'incoming' }]} {...threadProps} />);
    expect(screen.getByText('Bonjour').closest('[data-messaging-message-id="m1"]')).not.toBeNull();
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('MessageThread empty states', () => {
  it('MAIR-870 renders a text placeholder as a muted lib Text and a DataState as is, centred', () => {
    const base = { messages: [], mentionOptions: [], businessReferenceOptions: [] };
    const { rerender } = render(<MessageThread {...base} hasConversation={false} emptyStateLabel="Sélectionnez une conversation pour commencer." />);
    const text = screen.getByText('Sélectionnez une conversation pour commencer.');
    expect(text.getAttribute('data-m360-component')).toContain('Text');
    expect(text.parentElement?.className).toContain('justify-center');
    rerender(<MessageThread {...base} hasConversation={false} emptyStateLabel={<DataState state="empty" title="Aucune conversation" />} />);
    expect(screen.getByText('Aucune conversation').closest('[data-m360-component~="DataState"]')).not.toBeNull();
    rerender(<MessageThread {...base} hasConversation emptyStateLabel="" />);
    expect(screen.getByText('Aucun message dans cette conversation.').getAttribute('data-m360-component')).toContain('Text');
  });
});

// MAIR-1160: jsdom has no layout. The thread region gets a 300 px viewport over 100 px messages; the geometry
// follows its scrollTop so that the hook reads what an agent would see.
describe('MessageThread unread reading (MAIR-1160)', () => {
  const MESSAGE_HEIGHT = 100, VIEWPORT = 300;
  let restore: () => void = () => {};
  let scrolls: ScrollToOptions[] = [];
  let reduced = false;

  const install = (count: number) => {
    const proto = HTMLElement.prototype;
    const saved = {
      scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!,
      clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!,
      scrollTo: (proto as { scrollTo?: unknown }).scrollTo,
      matchMedia: window.matchMedia,
    };
    const isRegion = (node: Element) => node.classList.contains('overflow-y-auto');
    const regionOf = (node: Element) => node.closest('.overflow-y-auto') as HTMLElement | null;
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get() { return isRegion(this) ? count * MESSAGE_HEIGHT : 0; } });
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get() { return isRegion(this) ? VIEWPORT : 0; } });
    proto.getBoundingClientRect = function rect(this: HTMLElement) {
      if (isRegion(this)) return { top: 0, bottom: VIEWPORT, left: 0, right: 500, width: 500, height: VIEWPORT, x: 0, y: 0, toJSON() {} } as DOMRect;
      const id = this.dataset.messagingMessageId;
      const region = regionOf(this);
      if (!id || !region) return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
      const index = [...region.querySelectorAll('[data-messaging-message-id]')].indexOf(this);
      const top = index * MESSAGE_HEIGHT - region.scrollTop;
      return { top, bottom: top + MESSAGE_HEIGHT - 10, left: 0, right: 500, width: 500, height: MESSAGE_HEIGHT - 10, x: 0, y: top, toJSON() {} } as DOMRect;
    };
    (proto as unknown as { scrollTo: (options: ScrollToOptions) => void }).scrollTo = function scrollTo(this: HTMLElement, options: ScrollToOptions) {
      scrolls.push(options);
      this.scrollTop = Math.min(Number(options.top ?? 0), count * MESSAGE_HEIGHT - VIEWPORT);
    };
    window.matchMedia = ((query: string) => ({ matches: reduced && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    restore = () => {
      delete (proto as { getBoundingClientRect?: unknown }).getBoundingClientRect;
      Object.defineProperty(Element.prototype, 'scrollHeight', saved.scrollHeight);
      Object.defineProperty(Element.prototype, 'clientHeight', saved.clientHeight);
      (proto as { scrollTo?: unknown }).scrollTo = saved.scrollTo;
      window.matchMedia = saved.matchMedia;
    };
  };
  const messages = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `m${index + 1}`, content: `Message ${index + 1}`, direction: 'incoming' as const }));
  const region = () => document.querySelector<HTMLElement>('.overflow-y-auto')!;
  const agentScrollTo = (top: number) => {
    fireEvent.wheel(region());
    region().scrollTop = top;
    fireEvent.scroll(region());
  };

  afterEach(() => { restore(); scrolls = []; reduced = false; });

  it('opens on the first unread message after « Nouveaux messages » without marking it read', () => {
    install(10);
    const onRead = vi.fn();
    render(<MessageThread hasConversation conversationKey="c1" messages={messages(10)} unreadIds={['m5', 'm6', 'm7', 'm8', 'm9', 'm10']} onRead={onRead} {...threadProps} />);
    const separator = screen.getByRole('separator', { name: 'Nouveaux messages' });
    expect(separator.nextElementSibling).toHaveAttribute('data-messaging-message-id', 'm5');
    expect(scrolls[0]).toEqual({ top: 352, behavior: 'auto' });
    expect(onRead).not.toHaveBeenCalled();
    // m5 and m6 are on screen: four unread messages are left, announced in the polite region.
    expect(screen.getByRole('button', { name: '4 nouveaux messages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 nouveaux messages' }).closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('counts down while the agent scrolls, then hides the pill and marks read once at the end', () => {
    install(10);
    const onRead = vi.fn();
    render(<MessageThread hasConversation conversationKey="c1" messages={messages(10)} unreadIds={['m5', 'm6', 'm7', 'm8', 'm9', 'm10']} onRead={onRead} {...threadProps} />);
    act(() => agentScrollTo(500));
    expect(screen.getByRole('button', { name: '2 nouveaux messages' })).toBeInTheDocument();
    expect(onRead).not.toHaveBeenCalled();
    act(() => agentScrollTo(700));
    expect(screen.queryByRole('button', { name: /nouveaux? messages?/ })).toBeNull();
    expect(onRead).toHaveBeenCalledTimes(1);
    act(() => agentScrollTo(700));
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('a programmatic scroll to the end never marks read for the agent', () => {
    install(10);
    const onRead = vi.fn();
    render(<MessageThread hasConversation conversationKey="c1" messages={messages(10)} unreadIds={['m9', 'm10']} onRead={onRead} {...threadProps} />);
    act(() => { region().scrollTop = 700; fireEvent.scroll(region()); });
    expect(onRead).not.toHaveBeenCalled();
  });

  it('the pill scrolls smoothly to the last message and the end then marks read; instant under reduced motion', async () => {
    install(10);
    const onRead = vi.fn();
    const { unmount } = render(<MessageThread hasConversation conversationKey="c1" messages={messages(10)} unreadIds={['m5', 'm6', 'm7', 'm8', 'm9', 'm10']} onRead={onRead} {...threadProps} />);
    await userEvent.click(screen.getByRole('button', { name: '4 nouveaux messages' }));
    expect(scrolls.at(-1)).toEqual({ top: 1000, behavior: 'smooth' });
    act(() => { fireEvent.scroll(region()); });
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /nouveaux messages/ })).toBeNull();
    unmount();
    reduced = true;
    render(<MessageThread hasConversation conversationKey="c2" messages={messages(10)} unreadIds={['m8', 'm9', 'm10']} onRead={vi.fn()} {...threadProps} />);
    await userEvent.click(screen.getByRole('button', { name: /nouveaux? messages?/ }));
    expect(scrolls.at(-1)).toEqual({ top: 1000, behavior: 'auto' });
  });

  it('a thread without layout (hidden behind the list on a narrow screen) is not read at opening', () => {
    const onRead = vi.fn();
    render(<MessageThread hasConversation conversationKey="c1" messages={messages(2)} unreadIds={['m2']} onRead={onRead} {...threadProps} />);
    expect(onRead).not.toHaveBeenCalled();
  });

  it('a thread that does not scroll is marked read as soon as it is opened; without unread it opens at the end', () => {
    install(2);
    const onRead = vi.fn();
    const { rerender } = render(<MessageThread hasConversation conversationKey="c1" messages={messages(2)} unreadIds={['m2']} onRead={onRead} {...threadProps} />);
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /nouveau message/ })).toBeNull();
    restore(); install(10); scrolls = [];
    rerender(<MessageThread hasConversation conversationKey="c3" messages={messages(10)} unreadIds={[]} onRead={onRead} {...threadProps} />);
    expect(scrolls[0]).toEqual({ top: 1000, behavior: 'auto' });
    expect(screen.queryByRole('separator')).toBeNull();
    expect(onRead).toHaveBeenCalledTimes(1);
  });
});
