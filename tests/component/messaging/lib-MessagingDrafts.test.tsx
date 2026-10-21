import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { Messaging } from '@/components/messaging/Messaging';
import type { MessagingProps } from '@/components/messaging/Messaging';

const conversations = [
  { id: 4, name: 'Fil A', kind: 'direct' as const },
  { id: 5, name: 'Fil B', kind: 'direct' as const },
];
const mention = { id: 'agent', name: 'Agent', kind: 'direct' as const };
const reference = { id: 'project', title: 'Projet', kind: 'project' as const };
const input = () => screen.getAllByRole('textbox').find(element => element.getAttribute('placeholder') === 'Tapez votre message...')!;
const edit = (value: string) => fireEvent.change(input(), { target: { value } });
const select = (name: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
const visibleComposer = () => input().closest('form')!;
const attach = (name = 'draft.txt') => fireEvent.change(visibleComposer().querySelector('input[type="file"]')!, {
  target: { files: [new File(['draft'], name, { type: 'text/plain' })] },
});

describe('Messaging conversation drafts', () => {
  let revoke: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    let sequence = 0;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => `blob:draft-${++sequence}`) });
    revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  });

  const props: MessagingProps = { conversations, currentUserId: 'user-1', mentionOptions: [mention], businessReferences: [reference] };

  it('retains the complete draft only in its originating conversation', () => {
    const send = vi.fn(() => false);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('@Ag');
    fireEvent.click(screen.getByRole('button', { name: /@Agent/ }));
    edit('@Agent #Pr');
    fireEvent.click(screen.getByRole('button', { name: /#Projet/ }));
    attach();
    select('Fil B');
    expect(input()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    expect(within(visibleComposer()).queryByText('draft.txt')).toBeNull();
    edit('Brouillon B');
    select('Fil A');
    expect(input()).toHaveValue('@Agent #Projet ');
    expect(within(visibleComposer()).getByText('draft.txt')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(send).toHaveBeenCalledWith({ conversationId: 4, content: '@Agent #Projet', attachments: [expect.objectContaining({ name: 'draft.txt' })], mentions: [mention], businessLinks: [reference] });
    select('Fil B');
    expect(input()).toHaveValue('Brouillon B');
    expect(revoke).not.toHaveBeenCalled();
  });

  it.each([true, false, 'reject'] as const)('settles an asynchronous send in A without clearing B (%s)', async result => {
    let resolve!: (value: boolean) => void;
    let reject!: (reason: Error) => void;
    const pending = new Promise<boolean>((yes, no) => { resolve = yes; reject = no; });
    const send = vi.fn().mockReturnValueOnce(pending).mockReturnValue(true);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('Message A');
    attach();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    select('Fil B');
    expect(input()).toHaveValue('');
    edit('Message B');
    await act(async () => {
      if (result === 'reject') reject(new Error('Refused'));
      else resolve(result);
      await pending.catch(() => undefined);
    });
    expect(input()).toHaveValue('Message B');
    select('Fil A');
    expect(input()).toHaveValue(result === true ? '' : 'Message A');
    expect(input()).toBeEnabled();
    expect(revoke).toHaveBeenCalledTimes(result === true ? 1 : 0);
    expect(send.mock.calls[0][0].conversationId).toBe(4);
  });

  it('keeps pending state on A while B can submit independently', async () => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(yes => { resolve = yes; });
    const send = vi.fn().mockReturnValueOnce(pending).mockReturnValue(true);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('Message A');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    select('Fil B');
    edit('Message B');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(send.mock.calls.map(call => call[0].conversationId)).toEqual([4, 5]);
    select('Fil A');
    expect(input()).toHaveValue('Message A');
    expect(input()).toBeDisabled();
    await act(async () => { resolve(true); await pending; });
    expect(input()).toHaveValue('');
    expect(input()).toBeEnabled();
  });

  it('normalizes numeric ids, survives refreshed lists and creates only visited composers', () => {
    const send = vi.fn();
    const { container, rerender } = render(<Messaging {...props} onSendMessage={send} />);
    edit('A stable');
    expect(container.querySelectorAll('form')).toHaveLength(1);
    rerender(<Messaging {...props} conversations={[{ ...conversations[1], id: '5' }, { ...conversations[0], id: '4' }]} activeConversationId="4" onSendMessage={send} />);
    expect(input()).toHaveValue('A stable');
    rerender(<Messaging {...props} activeConversationId={5} onSendMessage={send} />);
    expect(input()).toHaveValue('');
    expect(container.querySelectorAll('form')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Envoyer' })).toHaveLength(1);
    expect(container.querySelector('[hidden] input[type="text"]')).toBeDisabled();
  });

  it('drops removed conversations and releases their attachment URLs', () => {
    const send = vi.fn();
    const { rerender } = render(<Messaging {...props} onSendMessage={send} />);
    edit('Removed A'); attach(); select('Fil B'); edit('Retained B');
    rerender(<Messaging {...props} conversations={[conversations[1]]} onSendMessage={send} />);
    expect(input()).toHaveValue('Retained B');
    expect(revoke).toHaveBeenCalledWith('blob:draft-1');
    rerender(<Messaging {...props} onSendMessage={send} />);
    select('Fil A');
    expect(input()).toHaveValue('');
  });

  it('resets every draft and releases URLs when the account changes or the component unmounts', () => {
    const send = vi.fn();
    const { rerender, unmount } = render(<Messaging {...props} onSendMessage={send} />);
    edit('Private A'); attach(); select('Fil B'); edit('Private B'); attach();
    rerender(<Messaging {...props} currentUserId="user-2" onSendMessage={send} />);
    expect(input()).toHaveValue('');
    expect(revoke.mock.calls).toEqual([['blob:draft-1'], ['blob:draft-2']]);
    attach('next.txt');
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:draft-3');
  });

  it('does not convert a confirmed send into a retry if URL cleanup fails', () => {
    revoke.mockImplementation(() => { throw new Error('URL cleanup unavailable'); });
    const send = vi.fn(() => true);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('Confirmed'); attach();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(input()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('freezes already-open emoji and mention actions until the send settles', async () => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(yes => { resolve = yes; });
    render(<Messaging {...props} onSendMessage={() => pending} />);
    edit('@Ag');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une réaction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(screen.getByRole('button', { name: /@Agent/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajouter une réaction' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajouter 👍' })).toBeDisabled();
    await act(async () => { resolve(false); await pending; });
    expect(input()).toHaveValue('@Ag');
    expect(screen.getByRole('button', { name: /@Agent/ })).toBeEnabled();
  });

  it('freezes attachment removal and business suggestions without losing a refused draft', async () => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(yes => { resolve = yes; });
    const send = vi.fn(() => pending);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('#Pr');
    attach();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(screen.getByRole('button', { name: /#Projet/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retirer draft.txt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Joindre un fichier' })).toBeDisabled();
    select('Fil B');
    edit('Separate B');
    await act(async () => { resolve(false); await pending; });
    expect(input()).toHaveValue('Separate B');
    select('Fil A');
    expect(input()).toHaveValue('#Pr');
    expect(screen.getByRole('button', { name: 'Retirer draft.txt' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /#Projet/ })).toBeEnabled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('settles two independent sends in reverse order without crossing drafts', async () => {
    let resolveA!: (value: boolean) => void;
    let resolveB!: (value: boolean) => void;
    const pendingA = new Promise<boolean>(yes => { resolveA = yes; });
    const pendingB = new Promise<boolean>(yes => { resolveB = yes; });
    const send = vi.fn().mockReturnValueOnce(pendingA).mockReturnValueOnce(pendingB);
    render(<Messaging {...props} onSendMessage={send} />);
    edit('Pending A'); attach('a.txt');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    select('Fil B'); edit('Pending B'); attach('b.txt');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await act(async () => { resolveB(true); await pendingB; });
    expect(input()).toHaveValue('');
    expect(revoke.mock.calls).toEqual([['blob:draft-2']]);
    select('Fil A');
    expect(input()).toHaveValue('Pending A');
    expect(input()).toBeDisabled();
    await act(async () => { resolveA(false); await pendingA; });
    expect(input()).toHaveValue('Pending A');
    expect(input()).toBeEnabled();
    expect(within(visibleComposer()).getByText('a.txt')).toBeVisible();
    expect(send.mock.calls.map(call => call[0].conversationId)).toEqual([4, 5]);
    expect(revoke.mock.calls).toEqual([['blob:draft-2']]);
  });

  it('ignores an old account send confirmation after a new account creates a draft', async () => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(yes => { resolve = yes; });
    const send = vi.fn(() => pending);
    const { rerender } = render(<Messaging {...props} onSendMessage={send} />);
    edit('Old private A'); attach('old.txt');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    rerender(<Messaging {...props} currentUserId="user-2" onSendMessage={send} />);
    edit('New private A'); attach('new.txt');
    await act(async () => { resolve(true); await pending; });
    expect(input()).toHaveValue('New private A');
    expect(within(visibleComposer()).getByText('new.txt')).toBeVisible();
    expect(input()).toBeEnabled();
    expect(revoke.mock.calls).toEqual([['blob:draft-1']]);
  });

  it('cannot clear a recreated conversation draft when its removed predecessor settles', async () => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(yes => { resolve = yes; });
    const send = vi.fn(() => pending);
    const { rerender } = render(<Messaging {...props} onSendMessage={send} />);
    edit('Removed pending A'); attach('removed.txt');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    rerender(<Messaging {...props} conversations={[conversations[1]]} onSendMessage={send} />);
    edit('B remains');
    rerender(<Messaging {...props} onSendMessage={send} />);
    select('Fil A'); edit('Recreated A'); attach('recreated.txt');
    await act(async () => { resolve(true); await pending; });
    expect(input()).toHaveValue('Recreated A');
    expect(within(visibleComposer()).getByText('recreated.txt')).toBeVisible();
    expect(revoke.mock.calls).toEqual([['blob:draft-1']]);
    select('Fil B');
    expect(input()).toHaveValue('B remains');
  });
});
