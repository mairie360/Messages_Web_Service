import type { MessageRealtimeEvent } from '@mairie360/bff-message-openapi/model';
import { BffNavigationRequiredError, BffRequestError, bffMessage } from './bff-client';
import type { MessageStreamState } from './message-stream';

/**
 * Real-time reception over the messaging WebSocket (contract: Message_API `docs/en/realtime-websocket.md`, "Client
 * behaviour"). The socket only signals that a conversation changed: the caller reads it again, so a lost signal is
 * caught up by the read that follows every `open`, and a duplicate only costs one read.
 */

/** Close codes the client acts on (any other one is retried with backoff). */
export const SOCKET_CLOSE = { SESSION_ENDED: 4001, EVICTED: 4008, ABNORMAL: 1006, NORMAL: 1000 } as const;
/** Consecutive failures without an `open` before falling back to the 2 s reload. */
export const SOCKET_MAX_FAILURES = 5;
const MAX_FRAME_LENGTH = 4096;
const EVENT_TYPES: ReadonlySet<string> = new Set(['NEW_MSG', 'MSG_EDITED', 'MSG_DELETED', 'CHAT_READ']);

/** Why `receiveMessageSocket` stopped: the controller polls every 2 s until focus, `online` or retry restarts it. */
export type SocketOutcome = 'aborted' | 'evicted' | 'unavailable' | 'authentication';

/** The part of a browser `WebSocket` the client uses, so tests can drive it. */
export type RealtimeSocket = Pick<WebSocket, 'onopen' | 'onmessage' | 'onclose' | 'onerror' | 'close'>;

/** Whether this browser can open the socket (otherwise the page falls back to the 2 s reload). */
export function socketSupported(scope: { WebSocket?: unknown } = globalThis) {
  return typeof scope.WebSocket === 'function';
}

/** The `/ws` route of the published contract on the page's own origin: `wss://` over HTTPS, `ws://` over plain HTTP. */
export function realtimeSocketUrl(location: { protocol: string; host: string }) {
  const path = bffMessage.getGetWsUrl();
  if (!/^\/(?!\/)/.test(path) || path.includes('\\')) throw new Error('La réception doit utiliser une route locale.');
  return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${path}`;
}

/** Backoff before the next attempt: `min(30 s, 1 s × 2^attempt)` ± 20 % so the tabs do not reconnect at once. */
export function reconnectDelay(attempt: number, random: () => number = Math.random) {
  const base = Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.8 + 0.4 * Math.min(1, Math.max(0, random()))));
}

/** A frame the client acts on; an unknown `type` or a malformed frame is ignored (new types may be added). */
export function isMessageRealtimeEvent(value: unknown): value is MessageRealtimeEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<MessageRealtimeEvent>;
  return typeof event.type === 'string' && EVENT_TYPES.has(event.type)
    && typeof event.conversationId === 'string' && event.conversationId.trim().length > 0 && event.conversationId.length <= 200;
}

const isAuthenticationFailure = (error: unknown): error is BffRequestError | BffNavigationRequiredError =>
  error instanceof BffNavigationRequiredError || (error instanceof BffRequestError && error.status === 401);

function sleep(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

/** One connection: resolves with its close code and whether it opened. */
function connectOnce(url: string, signal: AbortSignal, open: (url: string) => RealtimeSocket, handlers: {
  onOpen: () => void; onEvent: (event: MessageRealtimeEvent) => void;
}) {
  return new Promise<{ opened: boolean; code: number }>(resolve => {
    let socket: RealtimeSocket;
    try { socket = open(url); } catch { resolve({ opened: false, code: SOCKET_CLOSE.ABNORMAL }); return; }
    let opened = false;
    const abort = () => socket.close(SOCKET_CLOSE.NORMAL);
    signal.addEventListener('abort', abort, { once: true });
    socket.onopen = () => { opened = true; if (!signal.aborted) handlers.onOpen(); };
    socket.onmessage = ({ data }) => {
      if (signal.aborted || typeof data !== 'string' || data.length > MAX_FRAME_LENGTH) return;
      let value: unknown;
      try { value = JSON.parse(data); } catch { return; }
      if (isMessageRealtimeEvent(value)) handlers.onEvent(value);
    };
    socket.onerror = () => undefined; // A `close` always follows.
    socket.onclose = ({ code }) => { signal.removeEventListener('abort', abort); resolve({ opened, code }); };
    if (signal.aborted) abort();
  });
}

/**
 * Keeps the socket open until `signal` aborts, following the contract's client behaviour:
 * - `connected` on `open` (the caller then reads the conversations again, then stops its 2 s reload);
 * - `4001`, or `1006` before an `open` (a refused handshake looks the same to a browser): one REST read checks or
 *   renews the session; refused → `onAuthenticationError` (Login), never a reconnect loop; otherwise the attempt counts
 *   as a failure, so a server that keeps refusing still reaches the fallback;
 * - `4008` (evicted by a 6th connection): stop, so as not to evict another tab;
 * - anything else: reconnect after `reconnectDelay`, and stop after 5 failures without an `open`.
 * The state is `connecting` while it retries (the caller keeps reloading every 2 s) and `offline` once it stopped.
 */
export async function receiveMessageSocket({
  signal, onEvent, onState, onAuthenticationError, checkSession,
  location = window.location, open = url => new WebSocket(url), wait = sleep, random = Math.random,
}: {
  signal: AbortSignal;
  onEvent: (event: MessageRealtimeEvent) => void;
  onState: (state: MessageStreamState) => void;
  onAuthenticationError: (error: BffRequestError | BffNavigationRequiredError) => void | Promise<void>;
  /** One authenticated REST read through the proxy, which renews the session when it can. */
  checkSession: (signal: AbortSignal) => Promise<unknown>;
  location?: { protocol: string; host: string };
  open?: (url: string) => RealtimeSocket;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
}): Promise<SocketOutcome> {
  const url = realtimeSocketUrl(location);
  // Each attempt starts once the previous socket closed and its backoff settled (one socket at a time).
  const attempt = async (previousFailures: number, previousSessionChecked: boolean): Promise<SocketOutcome> => {
    if (signal.aborted) return 'aborted';
    onState('connecting');
    const { opened, code } = await connectOnce(url, signal, open, { onOpen: () => onState('connected'), onEvent });
    if (signal.aborted) return 'aborted';
    // An `open` starts a new sequence of failures.
    let sessionChecked = opened ? false : previousSessionChecked;
    const failures = (opened ? 0 : previousFailures) + 1;
    if (code === SOCKET_CLOSE.EVICTED) { onState('offline'); return 'evicted'; }
    if ((code === SOCKET_CLOSE.SESSION_ENDED || (code === SOCKET_CLOSE.ABNORMAL && !opened)) && !sessionChecked) {
      sessionChecked = true;
      try {
        await checkSession(signal);
      } catch (error) {
        if (signal.aborted) return 'aborted';
        if (isAuthenticationFailure(error)) { onState('offline'); await onAuthenticationError(error); return 'authentication'; }
      }
    }
    if (failures >= SOCKET_MAX_FAILURES) { onState('offline'); return 'unavailable'; }
    onState('connecting');
    try { await wait(reconnectDelay(failures - 1, random), signal); } catch { return 'aborted'; }
    return attempt(failures, sessionChecked);
  };
  return attempt(0, false);
}
