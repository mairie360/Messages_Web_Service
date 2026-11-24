const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-818: client side of the messaging WebSocket (Message_API docs/en/realtime-websocket.md, "Client behaviour").
const {
  receiveMessageSocket, reconnectDelay, realtimeSocketUrl, isMessageRealtimeEvent, socketSupported, SOCKET_MAX_FAILURES,
} = requireSrc('lib/message-socket.ts');
const { BffNavigationRequiredError, BffRequestError } = requireSrc('lib/bff-client.ts');

/** Scripted sockets: each `open(url)` takes the next script, which drives the socket once its handlers are set. */
function sockets(scripts) {
  const opened = [];
  const open = (url) => {
    const script = scripts.shift() ?? (socket => socket.closeWith(1006));
    const socket = {
      url, closedWith: undefined, onopen: null, onmessage: null, onclose: null, onerror: null,
      close(code) { this.closedWith = code; queueMicrotask(() => this.onclose?.({ code })); },
      accept() { this.onopen?.({}); },
      frame(data) { this.onmessage?.({ data }); },
      closeWith(code) { this.onerror?.({}); this.onclose?.({ code }); },
    };
    opened.push(socket);
    queueMicrotask(() => script(socket));
    return socket;
  };
  return { open, opened };
}

function run(scripts, overrides = {}) {
  const states = [];
  const events = [];
  const waits = [];
  const authErrors = [];
  let sessionChecks = 0;
  const controller = new AbortController();
  const { open, opened } = sockets(scripts);
  const done = receiveMessageSocket({
    signal: controller.signal,
    location: { protocol: 'https:', host: 'messages.mairie.test' },
    open,
    onState: state => states.push(state),
    onEvent: event => events.push(event),
    onAuthenticationError: error => { authErrors.push(error); },
    checkSession: async () => { sessionChecks += 1; if (overrides.session) await overrides.session(sessionChecks); },
    wait: async (milliseconds) => { waits.push(milliseconds); },
    random: () => 0.5,
    ...overrides.options,
  });
  return { done, states, events, waits, authErrors, opened, controller, sessionChecks: () => sessionChecks };
}

test('MAIR-818 the socket opens the contract /ws on the page origin, wss over HTTPS and ws over plain HTTP', () => {
  assert.equal(realtimeSocketUrl({ protocol: 'https:', host: 'messages.mairie.test' }), 'wss://messages.mairie.test/ws');
  assert.equal(realtimeSocketUrl({ protocol: 'http:', host: 'localhost:5003' }), 'ws://localhost:5003/ws');
  assert.equal(socketSupported({ WebSocket: function WebSocket() {} }), true);
  assert.equal(socketSupported({}), false);
});

test('MAIR-818 only the four contract signals with a conversation are acted on', () => {
  assert.equal(isMessageRealtimeEvent({ type: 'NEW_MSG', conversationId: 'conversation-5', messageId: 'message-1' }), true);
  assert.equal(isMessageRealtimeEvent({ type: 'CHAT_READ', conversationId: 'conversation-5', unreadCount: 0 }), true);
  assert.equal(isMessageRealtimeEvent({ type: 'SOMETHING_NEW', conversationId: 'conversation-5' }), false);
  assert.equal(isMessageRealtimeEvent({ type: 'NEW_MSG', conversationId: ' ' }), false);
  assert.equal(isMessageRealtimeEvent({ type: 'NEW_MSG', conversationId: 'c'.repeat(201) }), false);
  assert.equal(isMessageRealtimeEvent(null), false);
});

test('MAIR-818 the backoff doubles from 1 s, caps at 30 s and stays within ±20 %', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(attempt => reconnectDelay(attempt, () => 0.5)), [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  assert.equal(reconnectDelay(0, () => 0), 800);
  assert.equal(reconnectDelay(0, () => 1), 1200);
  assert.equal(reconnectDelay(5, () => 1), 36000);
});

test('MAIR-818 an open socket is connected and forwards valid signals, ignoring unknown, malformed or oversized frames', async () => {
  const session = run([socket => {
    socket.accept();
    socket.frame(JSON.stringify({ type: 'NEW_MSG', conversationId: 'conversation-5', messageId: 'message-118' }));
    socket.frame(JSON.stringify({ type: 'MEMBERS_CHANGED', conversationId: 'conversation-5' }));
    socket.frame('not json');
    socket.frame(JSON.stringify({ type: 'MSG_EDITED', conversationId: 'conversation-5', padding: 'x'.repeat(5000) }));
    socket.frame(new ArrayBuffer(4));
    socket.frame(JSON.stringify({ type: 'CHAT_READ', conversationId: 'conversation-5', messageId: 'message-118', unreadCount: 0 }));
    session.controller.abort();
  }]);
  assert.equal(await session.done, 'aborted');
  assert.equal(session.opened[0].url, 'wss://messages.mairie.test/ws');
  assert.deepEqual(session.states, ['connecting', 'connected']);
  assert.deepEqual(session.events.map(event => event.type), ['NEW_MSG', 'CHAT_READ']);
  assert.equal(session.opened[0].closedWith, 1000, 'leaving closes normally');
});

test('MAIR-818 a 4008 eviction stops without reconnecting, so another tab is not evicted in turn', async () => {
  const session = run([socket => { socket.accept(); socket.closeWith(4008); }]);
  assert.equal(await session.done, 'evicted');
  assert.equal(session.opened.length, 1);
  assert.deepEqual(session.states, ['connecting', 'connected', 'offline']);
  assert.equal(session.sessionChecks(), 0);
});

test('MAIR-818 a 4001 whose session check is refused goes to Login once, never in a reconnect loop', async () => {
  for (const refusal of [new BffRequestError('Session expirée', 401), new BffNavigationRequiredError()]) {
    const session = run([socket => { socket.accept(); socket.closeWith(4001); }], { session: async () => { throw refusal; } });
    assert.equal(await session.done, 'authentication');
    assert.deepEqual(session.authErrors, [refusal]);
    assert.equal(session.opened.length, 1);
    assert.equal(session.states.at(-1), 'offline');
  }
});

test('MAIR-818 a refused handshake (1006 before open) with a valid session counts as a failure and reaches the fallback after 5', async () => {
  const session = run([]);
  assert.equal(await session.done, 'unavailable');
  assert.equal(session.opened.length, SOCKET_MAX_FAILURES);
  assert.equal(session.sessionChecks(), 1, 'the session is checked once per sequence of failures');
  assert.deepEqual(session.waits, [1000, 2000, 4000, 8000]);
  assert.equal(session.states.at(-1), 'offline');
  assert.equal(session.authErrors.length, 0);
});

test('MAIR-818 a session check failing for another reason still lets the socket retry', async () => {
  const session = run([
    socket => socket.closeWith(1006),
    socket => { socket.accept(); session.controller.abort(); },
  ], { session: async () => { throw new BffRequestError('Indisponible', 503); } });
  assert.equal(await session.done, 'aborted');
  assert.equal(session.opened.length, 2);
  assert.deepEqual(session.states, ['connecting', 'connecting', 'connecting', 'connected']);
});

test('MAIR-818 an open resets the failure count, so a server going away (1001, 1013) is retried from 1 s', async () => {
  const session = run([
    socket => socket.closeWith(1013),
    socket => socket.closeWith(1011),
    socket => { socket.accept(); socket.closeWith(1001); },
    socket => { socket.accept(); session.controller.abort(); },
  ]);
  assert.equal(await session.done, 'aborted');
  assert.deepEqual(session.waits, [1000, 2000, 1000]);
  assert.equal(session.sessionChecks(), 0, 'codes other than 4001 and a refused handshake do not check the session');
});

test('MAIR-818 a socket that cannot be created counts as a refused handshake', async () => {
  const session = run([], { options: { open: () => { throw new Error('blocked'); } } });
  assert.equal(await session.done, 'unavailable');
  assert.equal(session.waits.length, SOCKET_MAX_FAILURES - 1);
});

test('MAIR-818 aborting during the backoff stops at once', async () => {
  const controller = new AbortController();
  const states = [];
  const done = receiveMessageSocket({
    signal: controller.signal, location: { protocol: 'http:', host: 'localhost:5003' },
    open: () => { const socket = { close() {} }; queueMicrotask(() => socket.onclose({ code: 1011 })); return socket; },
    onState: state => states.push(state), onEvent: () => {}, onAuthenticationError: () => {}, checkSession: async () => {},
    wait: (_milliseconds, signal) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(signal.reason)); controller.abort(); }),
  });
  assert.equal(await done, 'aborted');
  assert.deepEqual(states, ['connecting', 'connecting']);
});
