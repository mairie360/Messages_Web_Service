const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// HTML of the messaging page (src/app/page.tsx) rendered with react-dom/server against the mocked
// BFF Message: the real page, the real shell (session from GET /me) and the real Messaging component of
// @mairie360/lib-components are rendered, the hook state is kept between render passes
// (tests/support/server-view.cjs), so the markup reflects what the BFF answered.

const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { apiError, bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const Client = requireSrc('app/messages-client.tsx').default;

const messageBff = messageBffMock();
const userBff = new ContractMockServer('BFF_USER', OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json')));
const network = new FrontNetwork([messageBff, userBff]);
const browser = installBrowser();
let view;

// Known defect of the published @mairie360/bff-message-openapi contract (also reported by
// message-bff.contract-mocks.test.cjs): for /conversations/{conversationId}/messages, orval swapped the
// request body and the response models, so the real exchanges of the page cannot validate against it.
const KNOWN_CONTRACT_DEFECTS = [
  /^\[BFF_MESSAGE\] requête POST \/conversations\/\{conversationId\}\/messages \$body\.message: propriété requise manquante$/,
];
const swappedModel = (reply) => ({ ...reply, outOfContract: true });

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
  messageBff.reset();
  userBff.reset();
  network.reset();
  browser.reset();
  router.reset();
  network.cookies.accessToken = tokenFor(users.agent.id);
  messageBff.on('get', '/me', { body: currentUser() });
  messageBff.on('get', '/contacts', { body: { contacts: [contact(users.sophie), contact(users.thomas)] } });
  messageBff.on('get', '/business-references', { body: businessReferences() });
  messageBff.on('get', '/conversations', { body: {
    conversations: [conversation(4, 'Équipe communication'), conversation(5, 'Sophie Leroy', { kind: 'direct' })],
  } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: {
      conversation: conversation(4, 'Équipe communication'),
      messages: [message(1, 4, 'Bonjour à tous', users.sophie)],
    },
  }));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual([...messageBff.violations.filter((line) => !KNOWN_CONTRACT_DEFECTS.some((known) => known.test(line))), ...userBff.violations, ...network.violations], []);
});

const initial = () => ({ status: 'confirmed', data: bootstrap(), requested: '' });
const bootReads = () => messageBff.calls('/messaging/bootstrap');
const input = () => view.hostElements(props => props.placeholder === 'Tapez votre message...')[0].props;

test('confirmed server messages render immediately without repeating the bootstrap during hydration', async () => {
  view = mount(React.createElement(Client, { initial: initial() }));
  assert.match(view.html, /Bonjour à tous/);
  await view.waitFor(() => messageBff.calls('/conversations/{conversationId}/messages').length > 0);
  assert.equal(bootReads().length, 0);
  browser.tickIntervals(2_000);
  await view.settle();
  assert.equal(bootReads().length, 0);
});

test('same-account foreground updates and failures preserve the unsent server-seeded thread draft', async () => {
  view = mount(React.createElement(Client, { initial: initial() }));
  await view.waitFor(() => messageBff.calls('/conversations/{conversationId}/messages').length > 0);
  await view.fire(props => props.placeholder === 'Tapez votre message...', 'onChange', { target: { value: 'Draft after server render' } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: { conversation: conversation(4, 'Équipe communication'), messages: [message(22, 4, 'Foreground update', users.sophie)] } }));
  browser.focus();
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-22'));
  assert.equal(input().value, 'Draft after server render');
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ status: 503, body: apiError('SERVICE_UNAVAILABLE', 'Foreground unavailable') }));
  browser.focus();
  await view.waitFor(() => view.text().includes('La synchronisation des conversations est momentanément indisponible.'));
  assert.equal(input().value, 'Draft after server render');
  assert.match(view.text(), /Foreground update/);
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'POST').length, 0);
});

test('a refused initial server read recovers using the existing same-origin browser bootstrap', async () => {
  messageBff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  view = mount(React.createElement(Client, { initial: { status: 'unavailable', message: 'Initial server read unavailable' } }));
  await view.waitFor(() => bootReads().length === 1 && view.text().includes('Bonjour à tous'));
  assert.doesNotMatch(view.text(), /Initial server read unavailable/);
});

test('a streamed server-seeded conversation catches up and verifies foreground identity without losing its draft', async () => {
  window.ReadableStream = ReadableStream;
  messageBff.on('get', '/stream', { raw: ': connected\n\n', contentType: 'text/event-stream', outOfContract: true });
  messageBff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  try {
    view = mount(React.createElement(Client, { initial: initial() }));
    await view.waitFor(() => messageBff.calls('/stream').length > 0 && messageBff.calls('/conversations/{conversationId}/messages').length > 0);
    assert.equal(bootReads().length, 0);
    await view.fire(props => props.placeholder === 'Tapez votre message...', 'onChange', { target: { value: 'Draft across SSE catch-up' } });
    await view.waitFor(() => messageBff.calls('/conversations/{conversationId}/messages').length >= 2);
    assert.equal(input().value, 'Draft across SSE catch-up');
    browser.focus();
    await view.waitFor(() => bootReads().length === 1 && input().value === 'Draft across SSE catch-up');
    assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  } finally { view?.unmount(); delete window.ReadableStream; }
});
