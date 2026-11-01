import { sessionFetch } from '@mairie360/lib-components/browser';
import axios, { type AxiosAdapter } from 'axios';
import { getBffMessage } from '@mairie360/bff-message-openapi/endpoints/bffMessage';
import type { MessageStreamEvent } from '@mairie360/bff-message-openapi/model';
import { BffNavigationRequiredError, BffRequestError } from './bff-client';
import { createSseParser } from './sse-frames';

export type StreamCursor = { lastEventId: string; seen: string[] };
export type MessageStreamState = 'connecting' | 'connected' | 'offline' | 'polling';

const streamAdapter: AxiosAdapter = async config => {
  const url = axios.getUri(config);
  if (!/^\/(?!\/)/.test(url) || url.includes("\\")) throw new Error("La réception doit utiliser une route locale.");
  const response = await sessionFetch(url, {
    headers: { ...config.headers.toJSON() as Record<string, string>, Accept: 'text/event-stream' },
    credentials: 'same-origin', cache: 'no-store', redirect: 'manual',
    signal: config.signal as AbortSignal | undefined,
  });
  if (response.type === 'opaqueredirect') throw new BffNavigationRequiredError();
  if (!response.ok || response.status === 204) {
    const body = await response.json().catch(() => null);
    throw new BffRequestError(body?.error?.message ?? 'La réception automatique est indisponible.', response.status, body);
  }
  if (!response.body || response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'text/event-stream') throw new Error('La réception automatique a renvoyé une réponse invalide.');
  return { data: response.body, status: response.status, statusText: response.statusText, headers: { 'x-mairie360-stream-account': response.headers.get('x-mairie360-stream-account') }, config };
};
// The published operation supplies the URL; the adapter changes only its transport.
const streamClient = getBffMessage(axios.create({ adapter: streamAdapter }));

export function isMessageStreamEvent(value: unknown): value is MessageStreamEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<MessageStreamEvent>;
  return typeof event.type === 'string' && event.type.length > 0 && event.type.length <= 200
    && typeof event.conversationId === 'string' && event.conversationId.trim().length > 0 && event.conversationId.length <= 200;
}

function sleep(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function receiveMessageStream({ signal, cursor, account, onAccountChange, onEvent, onState, onAuthenticationError, wait = sleep, attempts = 5 }: {
  signal: AbortSignal;
  cursor: StreamCursor;
  account?: string | number;
  onAccountChange?: () => void | Promise<void>;
  onEvent: (event: MessageStreamEvent) => void;
  onState: (state: MessageStreamState) => void;
  onAuthenticationError: (error: BffRequestError | BffNavigationRequiredError) => void | Promise<void>;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  attempts?: number;
}) {
  let delay = 1_000;
  const maximumAttempts = Number.isSafeInteger(attempts) ? Math.max(1, Math.min(5, attempts)) : 5;
  // Reconnect only after the prior reader is released and its backoff settles.
  const receiveAttempt = async (attempt: number): Promise<void> => {
    if (attempt >= maximumAttempts || signal.aborted) return;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancel = () => { void reader?.cancel().catch(() => undefined); };
    try {
      onState('connecting');
      const headers = cursor.lastEventId && /^[\x20-\x7e]{1,512}$/.test(cursor.lastEventId) ? { 'Last-Event-ID': cursor.lastEventId } : undefined;
      const { data, headers: receivedHeaders } = await streamClient.getStream({ headers, signal });
      signal.throwIfAborted();
      const body = data as unknown as ReadableStream<Uint8Array>;
      if (account !== undefined && receivedHeaders['x-mairie360-stream-account'] !== encodeURIComponent(String(account))) {
        await body.cancel();
        onState('offline');
        await onAccountChange?.();
        return;
      }
      reader = body.getReader();
      signal.addEventListener('abort', cancel, { once: true });
      onState('connected');
      const decoder = new TextDecoder();
      const parser = createSseParser(frame => {
        if (signal.aborted) return;
        if (frame.retry !== undefined) delay = frame.retry;
        if (!frame.data) {
          if (frame.id !== undefined) cursor.lastEventId = frame.id;
          return;
        }
        let value: unknown;
        try { value = JSON.parse(frame.data); } catch { return; }
        if (!isMessageStreamEvent(value)) return;
        if (frame.id !== undefined) cursor.lastEventId = frame.id;
        if (frame.id && cursor.seen.includes(frame.id)) return;
        if (frame.id) { cursor.seen.push(frame.id); if (cursor.seen.length > 100) cursor.seen.shift(); }
        onEvent(value);
      });
      // SSE chunks and cursor updates must be consumed in transport order.
      const chunks = { [Symbol.asyncIterator]: () => ({ next: () => reader!.read() }) };
      for await (const chunk of chunks) {
        signal.throwIfAborted();
        parser.push(decoder.decode(chunk, { stream: true }));
        if (signal.aborted) break;
      }
      if (!signal.aborted) { parser.end(); throw new Error('Le flux de réception a été interrompu.'); }
    } catch (error) {
      if (signal.aborted) return;
      onState('offline');
      if (error instanceof BffNavigationRequiredError || (error instanceof BffRequestError && error.status === 401)) {
        await onAuthenticationError(error);
        return;
      }
      if (error instanceof BffRequestError && [204, 403, 404, 501].includes(error.status)) return;
    } finally {
      signal.removeEventListener('abort', cancel);
      await reader?.cancel().catch(() => undefined);
      reader?.releaseLock();
    }
    if (attempt + 1 < maximumAttempts) {
      try { await wait(Math.min(15_000, delay * 2 ** attempt), signal); } catch { return; }
    }
    return receiveAttempt(attempt + 1);
  };
  return receiveAttempt(0);
}
