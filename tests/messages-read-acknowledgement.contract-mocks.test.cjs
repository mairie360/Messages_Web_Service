const assert = require('node:assert/strict');
const { before, after, beforeEach, afterEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { apiError, bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const Page = requireSrc('app/page.tsx').default;
const bff = messageBffMock();
const network = new FrontNetwork([bff]);
const browser = installBrowser();
let view;

before(async () => {
  await bff.start();
  delete process.env.MESSAGE_BFF_URL;
  delete process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL;
  process.env.BFF_MESSAGE_BASE_URL = bff.url;
  network.install();
});
after(async () => { network.restore(); browser.restore(); await bff.stop(); });
beforeEach(() => {
  bff.reset(); network.reset(); browser.reset(); router.reset();
  network.cookies.accessToken = tokenFor(users.agent.id);
  bff.on('get', '/me', { body: currentUser() });
  bff.on('get', '/contacts', { body: { contacts: [contact(users.sophie), contact(users.thomas)] } });
  bff.on('get', '/business-references', { body: businessReferences() });
  bff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication', { unreadCount: 3 })] } });
  // The pinned Orval0.4.0 GET thread response has the already documented swapped
  // model. Keep this exception explicit; the read POST/reply remain schema checked.
  bff.on('get', '/conversations/{conversationId}/messages', { outOfContract: true, body: {
    conversation: conversation(4, 'Équipe communication', { unreadCount: 3 }),
    messages: [message(1, 4, 'Fil confirmé après lecture initiale', users.sophie)],
  } });
});
afterEach(() => {
  view?.unmount(); view = undefined;
  assert.deepEqual([...bff.violations, ...network.violations], []);
});
async function loaded() {
  const body = bootstrap();
  body.conversations = body.conversations.map(item => ({ ...item, unreadCount: 3 }));
  bff.on('get', '/messaging/bootstrap', { body });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.props('Messaging').messages.length &&
    view.props('Header').user.name !== 'Chargement…');
  await view.waitFor(() => view.text().includes('Fil confirmé après lecture initiale'));
  await view.settle();
  return { conversation: view.props('Messaging').conversations.find(item => item.id === view.props('Messaging').activeConversationId),
    message: view.props('Messaging').messages.find(item => item.conversationId === view.props('Messaging').activeConversationId) };
}
const reads = () => bff.calls('/conversations/{conversationId}/read', 'post');
const handler = () => {
  assert.equal(typeof view.props('Messaging').onReadVisibleMessages, 'function');
  return view.props('Messaging').onReadVisibleMessages;
};

test('bootstrap, focus and polling never acknowledge or locally clear unread counters', async () => {
  await loaded();
  await view.settle();
  browser.focus();
  browser.tickIntervals(2000);
  await view.settle();
  assert.equal(reads().length, 0);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
});

test('a pending explicit read is single-flight through its authoritative counter refresh', async () => {
  const target = await loaded();
  let finish;
  bff.on('post', '/conversations/{conversationId}/read', () => new Promise(resolve => {
    finish = () => resolve({ body: { conversationId: target.conversation.id, unreadCount: 0 } });
  }));
  const read = handler();
  let first;
  await view.act(() => { first = read(target.conversation, target.message); void read(target.conversation, target.message); });
  await view.waitFor(() => typeof finish === 'function');
  assert.equal(reads().length, 1);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
  finish();
  await view.act(() => first);
  assert.equal(reads().length, 1);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3, 'a stable fake reply zero cannot replace the fresh server count');
});

for (const reply of [
  { conversationId: 'conversation-5', unreadCount: 0 },
  { conversationId: 'conversation-4', unreadCount: -1 },
]) test(`an inconsistent read reply ${JSON.stringify(reply)} never updates a counter`, async () => {
  const target = await loaded();
  const initialReads = bff.calls('/conversations', 'get').length;
  bff.on('post', '/conversations/{conversationId}/read', { body: reply });
  await view.act(() => handler()(target.conversation, target.message));
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
  assert.equal(bff.calls('/conversations', 'get').length, initialReads);
  assert.match(view.text(), /n’ont pas pu être marqués comme lus/);
});

test('a refused counter refresh after a successful POST preserves the known thread and count', async () => {
  const target = await loaded();
  bff.on('post', '/conversations/{conversationId}/read', { body: { conversationId: target.conversation.id, unreadCount: 0 } });
  bff.on('get', '/conversations', { status: 503, body: apiError('UNAVAILABLE', 'Internal database detail'), outOfContract: true });
  await view.act(() => handler()(target.conversation, target.message));
  assert.equal(reads().length, 1);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
  assert.ok(view.props('Messaging').messages.some(item => item.id === target.message.id));
  assert.match(view.text(), /compteurs sont conservés/);
  assert.doesNotMatch(view.text(), /Internal database detail/);
});

test('a stale cached command after another selection or unmount cannot write', async () => {
  const target = await loaded();
  const read = handler();
  bff.on('get', '/conversations/{conversationId}/messages', { outOfContract: true, body: {
    conversation: conversation(5, 'Sophie Leroy', { unreadCount: 1 }), messages: [message(2, 5, 'Autre fil', users.sophie)],
  } });
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-5' &&
    typeof view.props('Messaging').onReadVisibleMessages === 'function');
  await view.act(() => read(target.conversation, target.message));
  assert.equal(reads().length, 0);
  const latestRead = handler();
  const latestTarget = { conversation: view.props('Messaging').conversations.find(item => item.id === 'conversation-5'),
    message: view.props('Messaging').messages.find(item => item.conversationId === 'conversation-5') };
  view.unmount(); view = undefined;
  await latestRead(latestTarget.conversation, latestTarget.message);
  assert.equal(reads().length, 0);
});

test('a late acknowledgement of A cannot refresh or alter B selected during its request', async () => {
  const target = await loaded();
  const initialReads = bff.calls('/conversations', 'get').length;
  let finish;
  bff.on('post', '/conversations/{conversationId}/read', () => new Promise(resolve => {
    finish = () => resolve({ body: { conversationId: target.conversation.id, unreadCount: 0 } });
  }));
  let pending;
  await view.act(() => { pending = handler()(target.conversation, target.message); });
  await view.waitFor(() => typeof finish === 'function');
  bff.on('get', '/conversations/{conversationId}/messages', { outOfContract: true, body: {
    conversation: conversation(5, 'Sophie Leroy', { unreadCount: 1 }), messages: [message(2, 5, 'Autre fil', users.sophie)],
  } });
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-5' &&
    typeof view.props('Messaging').onReadVisibleMessages === 'function');
  finish();
  await view.act(() => pending);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.equal(view.props('Messaging').conversations.find(item => item.id === 'conversation-5').unreadCount, 1);
  assert.equal(bff.calls('/conversations', 'get').length, initialReads);
  assert.equal(reads().length, 1);
});

test('explicit visible acknowledgement sends its exact ID then uses fresh counts instead of the reply zero', async () => {
  const target = await loaded();
  const initialReads = bff.calls('/conversations', 'get').length;
  bff.on('post', '/conversations/{conversationId}/read', { body: { conversationId: target.conversation.id, unreadCount: 0 } });
  bff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication', { unreadCount: 2 })] } });
  await view.act(() => handler()(target.conversation, target.message));
  assert.equal(reads().length, 1);
  assert.deepEqual(reads()[0].body, { readUntilMessageId: target.message.id });
  assert.equal(reads()[0].pathParams.conversationId, String(target.conversation.id));
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 2);
  assert.equal(bff.calls('/conversations', 'get').length, initialReads + 1);
});

test('a counter refresh arriving after another selection cannot overwrite the new thread counters', async () => {
  const target = await loaded();
  bff.on('post', '/conversations/{conversationId}/read', { body: { conversationId: target.conversation.id, unreadCount: 0 } });
  let finish;
  bff.on('get', '/conversations', () => new Promise(resolve => {
    finish = () => resolve({ body: { conversations: [
      conversation(4, 'Équipe communication', { unreadCount: 0 }),
      conversation(5, 'Sophie Leroy', { unreadCount: 0 }),
    ] } });
  }));
  let pending;
  await view.act(() => { pending = handler()(target.conversation, target.message); });
  await view.waitFor(() => typeof finish === 'function');
  bff.on('get', '/conversations/{conversationId}/messages', { outOfContract: true, body: {
    conversation: conversation(5, 'Sophie Leroy', { unreadCount: 1 }), messages: [message(2, 5, 'Autre fil', users.sophie)],
  } });
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-5' &&
    typeof view.props('Messaging').onReadVisibleMessages === 'function');
  finish();
  await view.act(() => pending);
  assert.equal(view.props('Messaging').conversations.find(item => item.id === 'conversation-5').unreadCount, 1);
  assert.equal(view.props('Messaging').conversations.find(item => item.id === 'conversation-4').unreadCount, 3);
  assert.ok(view.props('Messaging').messages.some(item => item.conversationId === 'conversation-5'));
  assert.equal(reads().length, 1);
});

test('a hidden document, absent message and foreign message cannot start a read write', async () => {
  const target = await loaded();
  const read = handler();
  await view.act(() => read(target.conversation, null));
  await view.act(() => read(target.conversation, { ...target.message, id: 'not-displayed' }));
  await view.act(() => read(target.conversation, { ...target.message, conversationId: 'conversation-5' }));
  browser.setHidden(true);
  await view.act(() => read(target.conversation, target.message));
  assert.equal(reads().length, 0);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
});

for (const status of [403, 503]) test(`a read refusal ${status} preserves the thread and counter without raw service details`, async () => {
  const target = await loaded();
  const initialReads = bff.calls('/conversations', 'get').length;
  bff.on('post', '/conversations/{conversationId}/read', {
    status, body: apiError('READ_UNAVAILABLE', 'Internal SQL / service detail'), outOfContract: true,
  });
  await view.act(() => handler()(target.conversation, target.message));
  assert.equal(reads().length, 1);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
  assert.ok(view.props('Messaging').messages.some(item => item.id === target.message.id));
  assert.match(view.text(), /n’ont pas pu être marqués comme lus/);
  assert.doesNotMatch(view.text(), /Internal SQL|service detail|HTTP 403|HTTP 503/);
  assert.equal(bff.calls('/conversations', 'get').length, initialReads);
});
