const assert = require('node:assert/strict');
const { before, after, beforeEach, afterEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');

// Messaging V2 (epic MAIR-821): the page wires the new BFF_Message operations into `Messaging`. The handlers the
// controller hands to `Messaging` are called as the components call them; every request and reply is checked
// against the published contract.
const Page = requireSrc('components/MessagesPage/MessagesPage.tsx').default;
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
  bff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication', { memberCount: 2 }), conversation(5, 'Sophie Leroy', { kind: 'direct' })] } });
  bff.on('get', '/conversations/{conversationId}/messages', { body: {
    conversation: conversation(4, 'Équipe communication', { memberCount: 2 }),
    messages: [message(1, 4, 'Bonjour à tous', users.sophie)],
  } });
});
afterEach(() => {
  view?.unmount(); view = undefined;
  assert.deepEqual([...bff.violations, ...network.violations], []);
});

async function loaded() {
  bff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.text().includes('Bonjour à tous'));
  await view.settle();
  return view.props('Messaging').conversations.find(item => item.id === 'conversation-4');
}
const messaging = () => view.props('Messaging');

test('MAIR-1164 the search panel reads one page of the open conversation', async () => {
  const group = await loaded();
  const body = { type: 'people', items: [{ id: `user-${users.sophie.id}`, name: users.sophie.name }], hasMore: false, total: 1 };
  bff.on('get', '/conversations/{conversationId}/search', { body });
  assert.deepEqual(await messaging().onSearch(group, { query: 'sophie', type: 'people' }), body);
  assert.deepEqual(Object.fromEntries(bff.calls('/conversations/{conversationId}/search')[0].url.searchParams), { q: 'sophie', type: 'people', limit: '20', offset: '0' });
});

test('MAIR-1165 adding and removing members appends the system note and the new size of the group', async () => {
  const group = await loaded();
  const members = [{ id: `user-${users.agent.id}`, name: users.agent.name, isAdmin: true }, { id: `user-${users.sophie.id}`, name: users.sophie.name, isAdmin: false }];
  bff.on('get', '/conversations/{conversationId}/members', { body: { canManage: true, members } });
  assert.deepEqual(await messaging().onLoadMembers(group, new AbortController().signal), { canManage: true, members });

  const added = { id: `user-${users.thomas.id}`, name: users.thomas.name, isAdmin: false };
  const note = message(20, 4, '', users.agent, { kind: 'system', systemEvent: { action: 'members_added', actorId: `user-${users.agent.id}`, actorName: users.agent.name, userIds: [added.id], userNames: [added.name] } });
  bff.on('post', '/conversations/{conversationId}/members', { body: { canManage: true, members: [...members, added], systemMessage: note } });
  const result = await view.act(() => messaging().onAddMembers(group, [added.id]));
  assert.equal(result.members.length, 3);
  await view.waitFor(() => messaging().conversations.find(item => item.id === 'conversation-4').memberCount === 3);
  assert.ok(messaging().messages.some(item => item.id === note.id && item.kind === 'system'));

  bff.on('delete', '/conversations/{conversationId}/members/{userId}', { status: 403, outOfContract: true, body: { error: { code: 'FORBIDDEN', message: 'Seul l’administrateur du groupe peut retirer un membre.', details: [] } } });
  await assert.rejects(view.act(() => messaging().onRemoveMember(group, added)), /administrateur du groupe/);
});

test('MAIR-1165 leaving a group removes it from the list with a confirmation toast', async () => {
  const group = await loaded();
  bff.on('post', '/conversations/{conversationId}/leave', { status: 204 });
  bff.on('get', '/conversations', { body: { conversations: [conversation(5, 'Sophie Leroy', { kind: 'direct' })] } });
  bff.on('get', '/conversations/{conversationId}/messages', { body: { conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }), messages: [] } });
  assert.equal(await view.act(() => messaging().onLeaveConversation(group)), true);
  await view.waitFor(() => !messaging().conversations.some(item => item.id === 'conversation-4'));
  assert.deepEqual(bff.calls('/conversations/{conversationId}/leave', 'post').map(call => call.pathParams.conversationId), ['conversation-4']);
  bff.on('post', '/conversations/{conversationId}/leave', { status: 404, outOfContract: true, body: { error: { code: 'NOT_FOUND', message: 'Conversation introuvable.', details: [] } } });
  await assert.rejects(view.act(() => messaging().onLeaveConversation(group)), /introuvable|quitter/);
});
