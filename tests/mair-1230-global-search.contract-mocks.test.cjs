const assert = require('node:assert/strict');
const { before, after, beforeEach, afterEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const { router } = installReactRuntime();
const React = require('react');
const { createBffSearchSource } = require('@mairie360/lib-components/shell');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');

// MAIR-1230: the header of the shared shell searches every module through BFF_Message's `GET /search`, relayed by
// the contract proxy, and a result of this module (`?conversation=<c>&message=<m>`) opens its conversation.
const Page = requireSrc('components/MessagesPage/MessagesPage.tsx').default;
const { messagingUrlSchema, messagingUrlTarget, publicMessagingId, serverMessagingSelection } = requireSrc('lib/messaging-page-query.ts');
const { readPageUrlState } = requireSrc('lib/page-url-state.ts');
const bff = messageBffMock();
const network = new FrontNetwork([bff]);
const browser = installBrowser();
let view;

const searchAnswer = () => ({
  groups: [
    { module: 'messages', items: [
      { kind: 'conversation', id: 5, title: 'Sophie Leroy', excerpt: null, parent_id: null, updated_at: '2026-11-20T09:30:00.000Z' },
      { kind: 'message', id: 7, title: 'Sophie Leroy', excerpt: 'Le permis est signé', parent_id: 5, updated_at: '2026-11-20T09:30:00.000Z' },
    ] },
    { module: 'projects', items: [{ kind: 'project', id: 3, title: 'Permis de la médiathèque', excerpt: null, parent_id: null, updated_at: '2026-11-18T08:00:00.000Z' }] },
  ],
  unavailable: ['calendar'],
});

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
  // The header search debounces its calls with the window timers.
  browser.window.setTimeout = setTimeout;
  browser.window.clearTimeout = clearTimeout;
  network.cookies.accessToken = tokenFor(users.agent.id);
  bff.on('get', '/me', { body: currentUser() });
  bff.on('get', '/contacts', { body: { contacts: [contact(users.sophie), contact(users.thomas)] } });
  bff.on('get', '/business-references', { body: businessReferences() });
  bff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  bff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication', { memberCount: 2 }), conversation(5, 'Sophie Leroy', { kind: 'direct' })] } });
  bff.on('get', '/conversations/{conversationId}/messages', (request) => ({ body: request.pathParams.conversationId === 'conversation-5'
    ? { conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }), messages: [message(7, 5, 'Le permis est signé', users.sophie)] }
    : { conversation: conversation(4, 'Équipe communication', { memberCount: 2 }), messages: [message(1, 4, 'Bonjour à tous', users.sophie)] } }));
});
afterEach(() => {
  view?.unmount(); view = undefined;
  assert.deepEqual([...bff.violations, ...network.violations], []);
});

test('MAIR-1230 GET /search is declared by the BFF_Message contract and relayed with the session', async () => {
  assert.ok(bff.contract.document.paths['/search']?.get, 'the synced contract declares GET /search');
  bff.on('get', '/search', { body: searchAnswer() });
  const response = await fetch('/search?q=permis&limit=5', { headers: { Accept: 'application/json' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), searchAnswer());
  const [call] = bff.calls('/search');
  assert.deepEqual(Object.fromEntries(call.url.searchParams), { q: 'permis', limit: '5' });
  assert.equal(call.headers.authorization, `Bearer ${network.cookies.accessToken}`);
});

test('MAIR-1230 the lib search source reads GET /search through the proxy and keeps the known modules', async () => {
  bff.on('get', '/search', { body: searchAnswer() });
  const found = await createBffSearchSource()('  permis ', new AbortController().signal);
  assert.deepEqual(found.groups.map(group => group.module), ['messages', 'projects']);
  assert.deepEqual(found.unavailable, ['calendar']);
  assert.equal(bff.calls('/search')[0].url.searchParams.get('q'), 'permis');
});

test('MAIR-1230 a failed search rejects instead of showing an empty answer', async () => {
  bff.on('get', '/search', { status: 502, body: { error: 'Bad gateway' }, outOfContract: true });
  await assert.rejects(createBffSearchSource()('permis', new AbortController().signal), /status 502/);
});

test('MAIR-1230 typing in the header search lists the results of every module with links to their target', async () => {
  bff.on('get', '/search', { body: searchAnswer() });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.text().includes('Bonjour à tous'));
  assert.equal(typeof view.props('HeaderSearch').searchSource, 'function');
  await view.fire(props => props.role === 'combobox' && props['aria-autocomplete'] === 'list', 'onChange', { target: { value: 'permis' } });
  await view.waitFor(html => html.includes('Permis de la médiathèque'), { timeout: 4000 });
  assert.equal(bff.calls('/search')[0].url.searchParams.get('q'), 'permis');
  // The messages module links to this page (MESSAGE_FRONT_URL); no Projects URL is configured here, so that result has no link.
  assert.deepEqual([...view.html.matchAll(/data-href="([^"]*)"/g)].map(match => match[1].replace(/&amp;/g, '&')),
    ['http://localhost:5003/?conversation=5', 'http://localhost:5003/?conversation=5&message=7']);
  assert.match(view.text(), /Calendrier ne répond pas/);
});

test('MAIR-1230 the numeric ids of a search link become the public ids of the page', () => {
  assert.equal(publicMessagingId('conversation', '5'), 'conversation-5');
  assert.equal(publicMessagingId('message', '7'), 'message-7');
  for (const kept of ['', 'conversation-5', '0', '-3', '5.2', 'abc']) assert.equal(publicMessagingId('conversation', kept), kept);
  assert.deepEqual(messagingUrlTarget(readPageUrlState('?conversation=5&message=7', messagingUrlSchema)), { conversation: 'conversation-5', message: 'message-7' });
  assert.deepEqual(messagingUrlTarget(readPageUrlState('?conversation=5', messagingUrlSchema)), { conversation: 'conversation-5', message: '' });
  assert.equal(serverMessagingSelection({ conversation: '5', message: '7' }), 'conversation-5');
});

test('MAIR-1230 a search link to a message opens its conversation and hands the message to the thread once', async () => {
  browser.window.location.search = '?conversation=5&message=7';
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.text().includes('Le permis est signé'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.doesNotMatch(view.text(), /introuvable ou inaccessible/);
  // The thread tried to reveal `message-7` (no DOM here, so not found) and the page dropped it: no reveal loop.
  await view.waitFor(() => view.props('Messaging').revealMessageId === '');
  assert.equal(bff.calls('/conversations/{conversationId}/messages').filter(call => call.pathParams.conversationId === 'conversation-5').length, 1);
  assert.doesNotMatch(view.text(), /introuvable ou inaccessible/);
});

test('MAIR-1230 a search link to an unknown conversation keeps the page usable and reveals nothing', async () => {
  browser.window.location.search = '?conversation=999&message=7';
  bff.on('get', '/conversations/{conversationId}/messages', (request) => (request.pathParams.conversationId === 'conversation-999'
    ? { status: 404, body: { error: 'Conversation introuvable' }, outOfContract: true }
    : { body: { conversation: conversation(4, 'Équipe communication', { memberCount: 2 }), messages: [message(1, 4, 'Bonjour à tous', users.sophie)] } }));
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.text().includes('Bonjour à tous'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.equal(view.props('Messaging').revealMessageId, '');
  assert.match(view.text(), /La conversation demandée est introuvable ou inaccessible/);
});

test('MAIR-1230 choosing another conversation drops the message of the search link', async () => {
  browser.window.location.search = '?conversation=5&message=7';
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length && view.text().includes('Le permis est signé'));
  const group = view.props('Messaging').conversations.find(item => item.id === 'conversation-4');
  await view.act(() => view.props('Messaging').onConversationSelect(group));
  await view.waitFor(() => view.text().includes('Bonjour à tous'));
  assert.equal(view.props('Messaging').revealMessageId, '');
});
