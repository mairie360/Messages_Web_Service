const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-818: the real messaging page (MessagesPage + controller + lib Messaging) on the mocked BFF Message, with a
// scripted browser WebSocket: the page uses /ws instead of the SSE stream, stops the 2 s reload while it is connected
// (epic MAIR-655 CA10), reads the conversation again on a signal (CA1, CA5), and falls back to the reload with the
// F2 « Réception retardée » banner when it cannot use the socket (CA9) or was evicted.

const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const Client = requireSrc('components/MessagesPage/MessagesPage.tsx').default;

const messageBff = messageBffMock();
const userBff = new ContractMockServer('BFF_USER', OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json')));
const network = new FrontNetwork([messageBff, userBff]);
const browser = installBrowser();
const KNOWN_CONTRACT_DEFECTS = [
  /^\[BFF_MESSAGE\] requête POST \/conversations\/\{conversationId\}\/messages \$body\.message: propriété requise manquante$/,
];
const swappedModel = (reply) => ({ ...reply, outOfContract: true });
let view;

/** Browser WebSocket double: every socket the page opens, driven by the test. */
const sockets = [];
const nativeWebSocket = global.WebSocket;
class FakeWebSocket {
  constructor(url) { this.url = url; this.closedWith = undefined; sockets.push(this); }
  close(code) { if (this.closedWith !== undefined) return; this.closedWith = code; queueMicrotask(() => this.onclose?.({ code })); }
  accept() { this.onopen?.({}); }
  signal(event) { this.onmessage?.({ data: JSON.stringify(event) }); }
  end(code) { if (this.closedWith !== undefined) return; this.closedWith = code; this.onclose?.({ code }); }
}

before(async () => {
  await messageBff.start();
  await userBff.start();
  delete process.env.MESSAGE_BFF_URL;
  delete process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL;
  process.env.BFF_MESSAGE_BASE_URL = messageBff.url;
  network.setOwner(userBff);
  network.install();
});
after(async () => {
  network.restore();
  browser.restore();
  await messageBff.stop();
  await userBff.stop();
});
beforeEach(() => {
  messageBff.reset(); userBff.reset(); network.reset(); browser.reset(); router.reset();
  sockets.length = 0;
  // In a browser `window.WebSocket` is the global the client constructs; under Node both must be the double.
  window.WebSocket = FakeWebSocket;
  global.WebSocket = FakeWebSocket;
  window.location.protocol = 'http:';
  window.location.host = 'localhost:5003';
  network.cookies.accessToken = tokenFor(users.agent.id);
  messageBff.on('get', '/me', { body: currentUser() });
  messageBff.on('get', '/contacts', { body: { contacts: [contact(users.sophie), contact(users.thomas)] } });
  messageBff.on('get', '/business-references', { body: businessReferences() });
  messageBff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  messageBff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication')] } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour à tous', users.sophie)] },
  }));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  delete window.WebSocket;
  global.WebSocket = nativeWebSocket;
  assert.deepEqual([...messageBff.violations.filter((line) => !KNOWN_CONTRACT_DEFECTS.some((known) => known.test(line))), ...userBff.violations, ...network.violations], []);
});

const start = async () => {
  view = mount(React.createElement(Client, { initial: { status: 'confirmed', data: bootstrap(), requested: '' } }));
  await view.waitFor(() => sockets.length === 1);
  return sockets[0];
};
const threadReads = () => messageBff.calls('/conversations/{conversationId}/messages').length;
const listReads = () => messageBff.calls('/conversations').length;
const banner = () => view.text().includes('Réception des messages retardée');

test('MAIR-818 the page opens /ws on its own origin and never the SSE stream when the browser has WebSocket', async () => {
  const socket = await start();
  assert.equal(socket.url, 'ws://localhost:5003/ws');
  socket.accept();
  await view.settle();
  assert.equal(messageBff.calls('/stream').length, 0);
});

test('MAIR-818 a connected socket stops the 2 s reload and a signal reads the conversation again', async () => {
  const socket = await start();
  socket.accept();
  await view.waitFor(() => threadReads() >= 1);
  await view.settle();
  const before = { list: listReads(), thread: threadReads() };
  browser.tickIntervals(2_000);
  browser.tickIntervals(2_000);
  await view.settle();
  assert.deepEqual({ list: listReads(), thread: threadReads() }, before, 'no polling while the socket is connected');

  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour à tous', users.sophie), message(2, 4, 'Nouveau message temps réel', users.sophie)] },
  }));
  socket.signal({ type: 'NEW_MSG', conversationId: 'conversation-4', messageId: 'message-2' });
  await view.waitFor(() => view.text().includes('Nouveau message temps réel'));
  assert.equal(banner(), false);
});

test('MAIR-818 a lost connection reloads every 2 s until the socket is back, then catches up without the banner', async () => {
  const socket = await start();
  socket.accept();
  await view.settle();
  socket.end(1013);
  await view.waitFor(() => sockets.length === 2, 3_000);
  const before = listReads();
  browser.tickIntervals(2_000);
  await view.waitFor(() => listReads() > before);
  assert.equal(banner(), false, 'a retry in progress is not yet a delayed reception');
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour à tous', users.sophie), message(3, 4, 'Posté pendant la coupure', users.sophie)] },
  }));
  sockets[1].accept();
  await view.waitFor(() => view.text().includes('Posté pendant la coupure'));
});

test('MAIR-818 an evicted tab (4008) shows the F2 banner, keeps reloading and reconnects only on retry', async () => {
  const socket = await start();
  socket.accept();
  await view.settle();
  socket.end(4008);
  await view.waitFor(banner);
  await view.settle();
  assert.equal(sockets.length, 1, 'no automatic reconnection after an eviction');
  const before = listReads();
  browser.tickIntervals(2_000);
  await view.waitFor(() => listReads() > before);
  await view.click((_props, text, tag) => tag === 'button' && text.includes('Réessayer la réception'));
  await view.waitFor(() => sockets.length === 2);
  sockets[1].accept();
  await view.waitFor(() => !banner());
});

test('MAIR-818 a refused handshake whose session is refused goes to Login instead of reconnecting', async () => {
  const socket = await start();
  messageBff.on('get', '/me', { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'Session expirée' } }, outOfContract: true });
  socket.end(1006);
  await view.waitFor(() => window.location.assigned.length > 0 || window.location.reloads > 0, 3_000);
  await view.settle();
  assert.equal(sockets.length, 1);
});

test('MAIR-818 a briefly hidden tab keeps its socket and reads the signals it got once visible again', async () => {
  const socket = await start();
  socket.accept();
  await view.settle();
  browser.setHidden(true);
  await view.settle();
  assert.equal(socket.closedWith, undefined, 'the socket stays open during the 60 s grace');
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour à tous', users.sophie), message(4, 4, 'Reçu onglet masqué', users.sophie)] },
  }));
  socket.signal({ type: 'NEW_MSG', conversationId: 'conversation-4', messageId: 'message-4' });
  await view.settle();
  browser.setHidden(false);
  await view.waitFor(() => view.text().includes('Reçu onglet masqué'));
  assert.equal(sockets.length, 1, 'no reconnection after a short absence');
});
