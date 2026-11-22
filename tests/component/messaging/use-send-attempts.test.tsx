import { it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { attemptMessage, sendAnnouncement, sendSignature, useSendAttempts } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging';

const payload = { conversationId: 'c1', content: 'Bonjour', mentions: [{ id: 'u1', name: 'Anne' }] };

it('MAIR-1162 a composer send of a message the bubble already delivered is confirmed without a second write', async () => {
  const onSend = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { result } = renderHook(() => useSendAttempts(onSend));
  await act(async () => { await result.current.send(payload); });
  expect(result.current.attempts).toEqual([expect.objectContaining({ status: 'failed' })]);
  await act(async () => { result.current.retry('c1'); await Promise.resolve(); await Promise.resolve(); });
  expect(result.current.attempts).toEqual([]);
  expect(result.current.released.c1).toEqual({ content: 'Bonjour', token: 1 });
  let outcome: unknown;
  act(() => { outcome = result.current.send(payload); });
  expect(outcome).toBe(true);
  expect(onSend).toHaveBeenCalledTimes(2);
});

it('MAIR-1162 a thrown send fails the attempt and is rethrown; synchronous results settle at once', () => {
  const onSend = vi.fn().mockImplementationOnce(() => { throw new Error('down'); }).mockReturnValueOnce(undefined);
  const { result } = renderHook(() => useSendAttempts(onSend));
  act(() => { expect(() => result.current.send(payload)).toThrow('down'); });
  expect(result.current.attempts[0].status).toBe('failed');
  act(() => { result.current.send(payload); });
  expect(result.current.attempts).toEqual([]);
  expect(result.current.announcement).toBe('Message envoyé.');
});

it('MAIR-1162 helpers: signature, announcements and the pending bubble', () => {
  expect(sendSignature(payload)).toBe(sendSignature({ ...payload }));
  expect(sendSignature(payload)).not.toBe(sendSignature({ ...payload, content: 'Autre' }));
  expect(sendAnnouncement('sending')).toBe('Envoi du message…');
  expect(sendAnnouncement('failed')).toMatch(/non envoyé/);
  expect(attemptMessage({ conversationId: 'c1', payload, signature: 's', status: 'failed' }))
    .toMatchObject({ id: 'send-attempt-c1', direction: 'outgoing', sendStatus: 'failed', content: 'Bonjour' });
  const { result } = renderHook(() => useSendAttempts(undefined));
  expect(result.current.send(payload)).toBeUndefined();
});
