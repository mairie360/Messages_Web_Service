import React from 'react';

import { messagingIdsMatch } from './messaging-model';
import type {
  MessagingContactId,
  MessagingMessage,
  MessagingSendMessagePayload,
  MessagingSendResult,
  MessagingSendStatus,
} from './messaging-types';

export interface SendAttempt {
  conversationId: MessagingContactId;
  payload: MessagingSendMessagePayload;
  signature: string;
  status: Exclude<MessagingSendStatus, 'sent'>;
}

/** What makes two sends the same message: text, files, mentions and links. */
export const sendSignature = (payload: MessagingSendMessagePayload) => JSON.stringify([
  payload.content,
  (payload.attachments ?? []).map((item) => String(item.id)),
  (payload.mentions ?? []).map((item) => String(item.id)),
  (payload.businessLinks ?? []).map((item) => String(item.id)),
]);

/** Spoken state of a send, for the polite live region of the thread. */
export const sendAnnouncement = (status: MessagingSendStatus) =>
  status === 'sending' ? 'Envoi du message…' : status === 'sent' ? 'Message envoyé.' : 'Message non envoyé. Réessayez l’envoi.';

/** The pending bubble of a send attempt (it is not a server message: no read tracking, no unread count). */
export const attemptMessage = (attempt: SendAttempt): MessagingMessage => ({
  id: `send-attempt-${String(attempt.conversationId)}`,
  conversationId: attempt.conversationId,
  content: attempt.payload.content,
  attachments: attempt.payload.attachments,
  mentions: attempt.payload.mentions,
  businessLinks: attempt.payload.businessLinks,
  direction: 'outgoing',
  sendStatus: attempt.status,
});

/**
 * MAIR-1162: the send of my messages, seen in the thread.
 * - While the consumer confirms a send, its bubble shows « Envoi… »; a refused or failed send stays as a « Non
 *   envoyé » bubble with « Réessayer l'envoi ». The composer keeps its draft until a send is confirmed (MAIR-370).
 * - One attempt per conversation: sending the same message again (from the bubble or the composer) retries that
 *   attempt, and a composer send of a message the bubble already delivered is confirmed without a second write.
 */
export function useSendAttempts(onSendMessage?: (payload: MessagingSendMessagePayload) => MessagingSendResult) {
  const [attempts, setAttempts] = React.useState<SendAttempt[]>([]);
  const [announcement, setAnnouncement] = React.useState('');
  /** Drafts delivered by « Réessayer l'envoi », per conversation: the composer releases an unchanged draft. */
  const [released, setReleased] = React.useState<Record<string, { content: string; token: number }>>({});
  const attemptsRef = React.useRef<SendAttempt[]>([]);
  const deliveredRef = React.useRef(new Map<string, string>());
  const update = (next: (current: SendAttempt[]) => SendAttempt[]) => {
    attemptsRef.current = next(attemptsRef.current);
    setAttempts(attemptsRef.current);
  };

  const send = (payload: MessagingSendMessagePayload): MessagingSendResult => {
    if (!onSendMessage || payload.conversationId === undefined) return onSendMessage?.(payload);
    const conversationId = payload.conversationId;
    const key = String(conversationId);
    const signature = sendSignature(payload);
    const current = attemptsRef.current.find((item) => messagingIdsMatch(item.conversationId, conversationId));
    if (current?.status === 'sending') return false;
    // The bubble already delivered this very message: the composer only lets its draft go.
    if (!current && deliveredRef.current.get(key) === signature) {
      deliveredRef.current.delete(key);
      return true;
    }
    deliveredRef.current.delete(key);
    const attempt: SendAttempt = { conversationId, payload, signature, status: 'sending' };
    update((items) => [...items.filter((item) => !messagingIdsMatch(item.conversationId, conversationId)), attempt]);
    setAnnouncement(sendAnnouncement('sending'));
    const settle = (confirmed: boolean) => {
      update((items) => confirmed
        ? items.filter((item) => item !== attempt)
        : items.map((item) => (item === attempt ? { ...item, status: 'failed' } : item)));
      setAnnouncement(sendAnnouncement(confirmed ? 'sent' : 'failed'));
      return confirmed;
    };
    let result: MessagingSendResult;
    try {
      result = onSendMessage(payload);
    } catch (error) {
      settle(false);
      throw error;
    }
    if (result instanceof Promise) {
      return result.then((value) => settle(value !== false) && value, (error: unknown) => {
        settle(false);
        throw error;
      });
    }
    settle(result !== false);
    return result;
  };

  /** « Réessayer l'envoi » of a failed bubble: the same message, once; the composer draft is released afterwards. */
  const retry = (conversationId: MessagingContactId) => {
    const attempt = attemptsRef.current.find((item) => messagingIdsMatch(item.conversationId, conversationId));
    if (!attempt || attempt.status !== 'failed') return;
    const outcome = send(attempt.payload);
    const remember = (value: unknown) => {
      if (value === false) return;
      const key = String(conversationId);
      deliveredRef.current.set(key, attempt.signature);
      setReleased((current) => ({ ...current, [key]: { content: attempt.payload.content, token: (current[key]?.token ?? 0) + 1 } }));
    };
    if (outcome instanceof Promise) void outcome.then(remember, () => undefined);
    else remember(outcome);
  };

  return { attempts, announcement, released, send, retry };
}
