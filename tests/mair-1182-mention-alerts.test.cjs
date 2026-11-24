const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1182: mention alerts. The pure model of the header bell (one entry per mentioning message, none for the
// conversation being read), then the real page (MessagesPage + controller + shell) on the mocked BFF Message with a
// scripted WebSocket: a MENTIONED frame feeds the bell, the bell lists it with the conversation name and its link,
// and following the link opens the conversation in the page and marks the mention read.

const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const Client = requireSrc('components/MessagesPage/MessagesPage.tsx').default;
const {
  addMention, markMentionsRead, markConversationMentionsRead, mentionNotificationItems, mentionNotificationSource,
  unreadMentionCount, conversationHref, withMentionAuthor, MAX_MENTION_ENTRIES,
} = requireSrc('lib/mention-notifications.ts');
const { isMessageRealtimeEvent } = requireSrc('lib/message-socket.ts');
const { messagingUrlSchema } = requireSrc('lib/messaging-page-query.ts');

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
  messageBff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication'), conversation(7, 'Urbanisme')] } });
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

const now = new Date('2026-11-24T10:00:00.000Z');
const mentionOf = (conversationId, messageId) => ({ type: 'MENTIONED', conversationId, messageId });

// ----- Model of the bell (TU) -----

test('MAIR-1182 the socket acts on MENTIONED only with the message that mentions the agent', () => {
  assert.equal(isMessageRealtimeEvent(mentionOf('conversation-7', 'message-9')), true);
  assert.equal(isMessageRealtimeEvent({ type: 'MENTIONED', conversationId: 'conversation-7' }), false);
  assert.equal(isMessageRealtimeEvent({ type: 'MENTIONED', conversationId: 'conversation-7', messageId: ' ' }), false);
  assert.equal(isMessageRealtimeEvent({ type: 'MENTIONED', conversationId: 'conversation-7', messageId: 'm'.repeat(201) }), false);
});

test('MAIR-1182 a mention makes one entry, however often its signal arrives', () => {
  let entries = addMention([], mentionOf('conversation-7', 'message-9'), { now });
  entries = addMention(entries, mentionOf('conversation-7', 'message-9'), { now });
  assert.deepEqual(entries, [{ messageId: 'message-9', conversationId: 'conversation-7', receivedAt: now.toISOString(), read: false }]);
  entries = addMention(entries, mentionOf('conversation-4', 'message-10'), { now });
  assert.deepEqual(entries.map(entry => entry.messageId), ['message-10', 'message-9']);
  assert.equal(unreadMentionCount(entries), 2);
});

test('MAIR-1182 no entry for the conversation the agent is reading, nor for a signal without message', () => {
  assert.deepEqual(addMention([], mentionOf('conversation-7', 'message-9'), { now, openConversationId: 'conversation-7' }), []);
  assert.deepEqual(addMention([], { conversationId: 'conversation-7' }, { now }), []);
  assert.equal(addMention([], mentionOf('conversation-7', 'message-9'), { now, openConversationId: '' }).length, 1);
});

test('MAIR-1182 the bell keeps the newest mentions only', () => {
  let entries = [];
  for (let id = 0; id <= MAX_MENTION_ENTRIES; id += 1) entries = addMention(entries, mentionOf('conversation-7', `message-${id}`), { now });
  assert.equal(entries.length, MAX_MENTION_ENTRIES);
  assert.equal(entries[0].messageId, `message-${MAX_MENTION_ENTRIES}`);
  assert.equal(entries.some(entry => entry.messageId === 'message-0'), false);
});

test('MAIR-1182 marking read: by entry and by opened conversation, unchanged list when nothing changes', () => {
  const entries = [mentionOf('conversation-7', 'message-9'), mentionOf('conversation-4', 'message-10')]
    .reduce((list, signal) => addMention(list, signal, { now }), []);
  assert.equal(markMentionsRead(entries, ['message-unknown']), entries);
  assert.deepEqual(markMentionsRead(entries, ['message-9']).map(entry => entry.read), [false, true]);
  assert.deepEqual(markConversationMentionsRead(entries, 'conversation-4').map(entry => entry.read), [true, false]);
  const read = markConversationMentionsRead(entries, 'conversation-4');
  assert.equal(markConversationMentionsRead(read, 'conversation-4'), read);
});

test('MAIR-1182 the bell names the conversation and links to it, keeping the other query parameters', async () => {
  const entries = [mentionOf('conversation-7', 'message-9'), mentionOf('conversation-5', 'message-11'), mentionOf('conversation-8', 'message-12')]
    .reduce((list, signal) => addMention(list, signal, { now }), []);
  const href = id => conversationHref('https://messages.mairie.test/?event=3', id, messagingUrlSchema);
  const items = mentionNotificationItems(entries, [
    { id: 'conversation-7', name: 'Urbanisme', kind: 'group' },
    { id: 'conversation-5', name: 'Sophie Martin', kind: 'direct' },
  ], href);
  assert.deepEqual(items.map(({ id, title, message, category, read, href: link, clickable, date }) => ({ id, title, message, category, read, link, clickable, date })), [
    { id: 'message-12', title: 'Mention dans une conversation', message: 'Un message vous mentionne.', category: 'messages', read: false, link: '/?event=3&conversation=conversation-8', clickable: true, date: now.toISOString() },
    { id: 'message-11', title: 'Mention dans « Sophie Martin »', message: 'Sophie Martin vous a mentionné(e).', category: 'messages', read: false, link: '/?event=3&conversation=conversation-5', clickable: true, date: now.toISOString() },
    { id: 'message-9', title: 'Mention dans « Urbanisme »', message: 'Un message vous mentionne.', category: 'messages', read: false, link: '/?event=3&conversation=conversation-7', clickable: true, date: now.toISOString() },
  ]);
  const marked = [];
  const source = mentionNotificationSource(items, ids => marked.push(...ids));
  assert.deepEqual((await source.list(new AbortController().signal)).map(item => item.id), ['message-12', 'message-11', 'message-9']);
  assert.deepEqual(await source.markRead(['message-9', 'message-unknown']), ['message-9']);
  assert.deepEqual(marked, ['message-9']);
});

test('MAIR-1182 the alert names the author once the page read the message', () => {
  const entries = addMention([], mentionOf('conversation-7', 'message-9'), { now });
  assert.equal(withMentionAuthor(entries, 'message-9', ' '), entries);
  assert.equal(withMentionAuthor(entries, 'message-unknown', 'Sophie Martin'), entries);
  const named = withMentionAuthor(entries, 'message-9', 'Sophie Martin');
  assert.equal(named[0].authorName, 'Sophie Martin');
  assert.equal(withMentionAuthor(named, 'message-9', 'Sophie Martin'), named);
  const [item] = mentionNotificationItems(named, [{ id: 'conversation-7', name: 'Urbanisme', kind: 'group' }], id => `/?conversation=${id}`);
  assert.equal(item.title, 'Mention dans « Urbanisme »');
  assert.equal(item.message, 'Sophie Martin vous a mentionné(e).');
});

// ----- The page on the socket (TI technical) -----

const shell = () => view.props('AppShell', 0);
const bell = () => shell().notifications;

test('MAIR-1182 a MENTIONED frame feeds the header bell once, with the conversation name and link', async () => {
  const socket = await start();
  socket.accept();
  await view.waitFor(() => threadReads() >= 1);
  await view.settle();
  assert.equal(bell().count, 0);

  socket.signal({ type: 'NEW_MSG', conversationId: 'conversation-7', messageId: 'message-9' });
  socket.signal(mentionOf('conversation-7', 'message-9'));
  socket.signal(mentionOf('conversation-7', 'message-9'));
  await view.waitFor(() => bell().count === 1);
  await view.settle();
  assert.equal(bell().count, 1, 'one alert per mention');
  const [item, ...others] = await bell().source.list(new AbortController().signal);
  assert.deepEqual(others, []);
  assert.equal(item.title, 'Mention dans « Urbanisme »');
  assert.equal(item.read, false);
  assert.equal(new URL(item.href, 'http://localhost:5003').searchParams.get('conversation'), 'conversation-7');
  assert.equal(bell().conversationOf(item.href), 'conversation-7');
  assert.equal(bell().conversationOf('/?conversation=conversation-unknown'), null);
});

test('MAIR-1182 a mention in the conversation being read makes no alert', async () => {
  const socket = await start();
  socket.accept();
  await view.waitFor(() => threadReads() >= 1);
  await view.settle();
  socket.signal(mentionOf('conversation-4', 'message-2'));
  await view.settle();
  await new Promise(resolve => setTimeout(resolve, 300));
  await view.settle();
  assert.equal(bell().count, 0);
  assert.deepEqual(await bell().source.list(new AbortController().signal), []);
});

test('MAIR-1182 following the alert opens the mentioned conversation in the page and marks it read', async () => {
  const socket = await start();
  socket.accept();
  await view.waitFor(() => threadReads() >= 1);
  await view.settle();
  socket.signal(mentionOf('conversation-7', 'message-9'));
  await view.waitFor(() => bell().count === 1);

  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(7, 'Urbanisme'), messages: [message(9, 7, 'Avis sur le PLU @Agent', users.sophie)] },
  }));
  const before = threadReads();
  await view.act(() => shell().onOpenConversation('conversation-7'));
  await view.waitFor(() => view.text().includes('Avis sur le PLU'));
  assert.ok(threadReads() > before);
  assert.equal(String(view.props('Messaging').activeConversationId), 'conversation-7');
  assert.equal(bell().count, 0);
  const [item] = await bell().source.list(new AbortController().signal);
  assert.equal(item.read, true);
  assert.equal(window.location.assigned.length, 0, 'no page reload');
});

test('MAIR-1182 the bell names the colleague who wrote the mentioning message, with a single read', async () => {
  const socket = await start();
  socket.accept();
  await view.waitFor(() => threadReads() >= 1);
  await view.settle();
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(7, 'Urbanisme'), messages: [message(9, 7, 'Avis sur le PLU @Agent', users.sophie)] },
  }));
  const reads = () => messageBff.calls('/conversations/{conversationId}/messages').filter(call => call.url.pathname.includes('conversation-7')).length;
  socket.signal(mentionOf('conversation-7', 'message-9'));
  socket.signal(mentionOf('conversation-7', 'message-9'));
  const named = async () => (await bell().source.list(new AbortController().signal))[0]?.message;
  let text;
  for (let attempt = 0; attempt < 40 && text !== `${users.sophie.name} vous a mentionné(e).`; attempt += 1) {
    await view.settle();
    await new Promise(resolve => setTimeout(resolve, 25));
    text = await named();
  }
  assert.equal(text, `${users.sophie.name} vous a mentionné(e).`);
  assert.equal(reads(), 1, 'the author is read once per mention');
});
