const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// The messaging page opened from a project (`?context=project-<n>`), rendered against the mocked BFF Message: the
// title comes from the BFF (`GET /link-suggestions`), the « Message contextuel » bar and « Nouveau message » open on
// arrival, the project is sent as the business link of the first message (new or existing direct conversation, or
// the open thread), then the context is dropped; an unreadable project opens the page without a context.

const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const Page = requireSrc('components/MessagesPage/MessagesPage.tsx').default;
const { withContextLink, PROJECT_CONTEXT } = requireSrc('lib/messaging-context.ts');
const { messagingUrlSchema } = requireSrc('lib/messaging-page-query.ts');
const { readPageUrlState } = requireSrc('lib/page-url-state.ts');

const messageBff = messageBffMock();
const userBff = new ContractMockServer('BFF_USER', OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json')));
const network = new FrontNetwork([messageBff, userBff]);
const browser = installBrowser();
const KNOWN_CONTRACT_DEFECTS = [
  /^\[BFF_MESSAGE\] requête POST \/conversations\/\{conversationId\}\/messages \$body\.message: propriété requise manquante$/,
];
const swappedModel = (reply) => ({ ...reply, outOfContract: true });
const PROJECT = { id: 'project-7', kind: 'project', title: 'Rénovation de la médiathèque', url: 'https://projects.mairie.test/?project=7' };
const sophie = conversation(5, 'Sophie Leroy', { kind: 'direct', contactId: `user-${users.sophie.id}` });
const projectLink = { id: 'project-7', kind: 'project', title: PROJECT.title, url: PROJECT.url };
let view;

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
  network.cookies.accessToken = tokenFor(users.agent.id);
  messageBff.on('get', '/me', { body: currentUser() });
  messageBff.on('get', '/contacts', { body: { contacts: [contact(users.sophie), contact(users.thomas)] } });
  messageBff.on('get', '/business-references', { body: businessReferences() });
  messageBff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication'), sophie] } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour à tous', users.sophie)] },
  }));
  messageBff.on('get', '/link-suggestions', { body: {
    items: [{ id: 'task-3', kind: 'task', title: 'Rénovation de la médiathèque' }, PROJECT], sources: { projects: 'available', calendar: 'available' },
  } });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual([...messageBff.violations.filter((line) => !KNOWN_CONTRACT_DEFECTS.some((known) => known.test(line))), ...userBff.violations, ...network.violations], []);
});

async function arrive(search = '?context=project-7') {
  browser.window.location.search = search;
  messageBff.on('get', '/messaging/bootstrap', { body: { ...bootstrap(), conversations: [conversation(4, 'Équipe communication'), sophie] } });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length > 0 && view.props('Messaging').emptyStateLabel === undefined);
}
const contextOf = () => view.props('Messaging').contextReference;
const toasts = () => view.html.match(/data-m360-component="Toast"[^]*?<\/div>\s*<\/div>/g)?.join(' ') ?? '';

test('MAIR-1181 only a project id is accepted as the context of the page, and a link is sent once', () => {
  assert.equal(readPageUrlState('?context=project-7&conversation=conversation-4', messagingUrlSchema).context, 'project-7');
  for (const refused of ['task-7', 'project-0', 'project-', 'project-1234567890', 'Rénovation', '']) {
    assert.equal(PROJECT_CONTEXT.test(refused), false, refused);
    assert.equal(readPageUrlState(`?context=${encodeURIComponent(refused)}`, messagingUrlSchema).context, '');
  }
  assert.deepEqual(withContextLink([{ id: 'task-3' }], { id: 'project-7' }), [{ id: 'task-3' }, { id: 'project-7' }]);
  assert.deepEqual(withContextLink([{ id: 'project-7' }], { id: 'project-7' }), [{ id: 'project-7' }]);
  assert.deepEqual(withContextLink(undefined, undefined), []);
});

test('MAIR-1181 arriving from a project shows its title read from the BFF and opens « Nouveau message »', async () => {
  await arrive('?context=project-7&title=Faux%20titre');
  await view.waitFor(() => contextOf()?.title === PROJECT.title);

  assert.deepEqual(contextOf(), { id: 'project-7', kind: 'project', title: PROJECT.title, href: PROJECT.url });
  assert.equal(messageBff.calls('/link-suggestions', 'GET').length, 1);
  assert.match(view.html, /aria-label="Message contextuel"[^]*?Projet : Rénovation de la médiathèque/);
  assert.match(view.html, /href="https:\/\/projects\.mairie\.test\/\?project=7"[^>]*>Ouvrir/);
  assert.match(view.html, /aria-label="Retirer le contexte"/);
  assert.equal(view.props('NewMessageModal').isOpen, true);
  assert.equal(view.props('NewMessageModal').subtitle, 'Message lié au projet « Rénovation de la médiathèque »');
  assert.doesNotMatch(view.text(), /Faux titre/);
});

test('MAIR-1181 the first message to a colleague carries the project on POST /direct-messages, then the context is gone', async () => {
  await arrive();
  await view.waitFor(() => contextOf() !== undefined);
  messageBff.on('post', '/direct-messages', { status: 201, body: {
    conversation: conversation(6, 'Thomas Bernard', { kind: 'direct', contactId: `user-${users.thomas.id}` }),
    message: message(8, 6, 'Le planning est prêt', users.agent, { links: [projectLink] }),
  } });

  assert.equal(await view.act(() => view.props('NewMessageModal').onSendMessage({ recipientId: `user-${users.thomas.id}`, message: 'Le planning est prêt' })), true);
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-6');

  assert.deepEqual(messageBff.calls('/direct-messages', 'POST').map((call) => call.body), [
    { recipientId: `user-${users.thomas.id}`, message: 'Le planning est prêt', links: [{ id: 'project-7' }] },
  ]);
  await view.waitFor(() => contextOf() === undefined);
  assert.doesNotMatch(view.html, /aria-label="Message contextuel"/);
  // The bubble shows the project as a link to its page.
  assert.match(view.html, /href="https:\/\/projects\.mairie\.test\/\?project=7"/);
});

test('MAIR-1181 a colleague with a direct conversation gets the project link in that conversation', async () => {
  await arrive();
  await view.waitFor(() => contextOf() !== undefined);
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
    message: message(9, 5, 'Voir le projet', users.agent, { links: [projectLink] }),
    conversation: { ...sophie, lastMessage: 'Voir le projet' },
  } }));

  assert.equal(await view.act(() => view.props('NewMessageModal').onSendMessage({ recipientId: `user-${users.sophie.id}`, message: 'Voir le projet' })), true);
  const [call] = messageBff.calls('/conversations/{conversationId}/messages', 'POST');
  assert.equal(call.pathParams.conversationId, 'conversation-5');
  assert.deepEqual(call.body, { content: 'Voir le projet', attachmentIds: [], mentionIds: [], links: [{ id: 'project-7' }] });
  assert.equal(messageBff.calls('/direct-messages', 'POST').length, 0);
  await view.waitFor(() => contextOf() === undefined);
});

test('MAIR-1181 closing the modal keeps the context for the open conversation, sent once with the composer links', async () => {
  await arrive();
  await view.waitFor(() => contextOf() !== undefined);
  await view.act(() => view.props('NewMessageModal').onCancel());
  assert.equal(view.props('NewMessageModal').isOpen, false);
  assert.ok(contextOf(), 'the bar stays until the first message');
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
    message: message(10, 4, 'Point sur le projet', users.agent, { links: [projectLink] }),
    conversation: conversation(4, 'Équipe communication'),
  } }));

  assert.equal(await view.act(() => view.props('Messaging').onSendMessage({
    conversationId: 'conversation-4', content: 'Point sur le projet', businessLinks: [{ id: 'project-7', kind: 'project', title: PROJECT.title }], context: contextOf(),
  })), true);
  assert.deepEqual(messageBff.calls('/conversations/{conversationId}/messages', 'POST')[0].body.links, [{ id: 'project-7' }]);
  await view.waitFor(() => contextOf() === undefined);
});

test('MAIR-1181 a refused send keeps the context for a retry', async () => {
  await arrive();
  await view.waitFor(() => contextOf() !== undefined);
  messageBff.on('post', '/direct-messages', { status: 400, body: { error: { code: 'BAD_REQUEST', message: 'link not readable' } }, outOfContract: true });

  assert.equal(await view.act(() => view.props('NewMessageModal').onSendMessage({ recipientId: `user-${users.thomas.id}`, message: 'Bonjour' })), false);
  await view.settle();
  assert.equal(contextOf()?.id, 'project-7');
});

test('MAIR-1181 « Retirer » drops the context: the next message carries no link', async () => {
  await arrive();
  await view.waitFor(() => contextOf() !== undefined);
  await view.act(() => view.props('ContextReferenceBar').onRemove());
  await view.waitFor(() => contextOf() === undefined);
  await view.waitFor(() => /Contexte retiré/.test(view.html));
  assert.match(view.html, /Le message ne sera plus lié au projet\./);
  messageBff.on('post', '/direct-messages', { status: 201, body: {
    conversation: conversation(6, 'Thomas Bernard', { kind: 'direct', contactId: `user-${users.thomas.id}` }),
    message: message(8, 6, 'Bonjour', users.agent),
  } });

  assert.equal(await view.act(() => view.props('Messaging').onNewMessageSend({ recipientId: `user-${users.thomas.id}`, message: 'Bonjour' })), true);
  assert.deepEqual(messageBff.calls('/direct-messages', 'POST')[0].body, { recipientId: `user-${users.thomas.id}`, message: 'Bonjour' });
});

for (const [label, reply] of [
  ['a project the agent may not read', { body: { items: [{ id: 'project-8', kind: 'project', title: 'Autre projet' }], sources: { projects: 'available', calendar: 'available' } } }],
  ['an unavailable BFF', { status: 503, body: { error: { code: 'UNAVAILABLE', message: 'Indisponible' } }, outOfContract: true }],
]) {
  test(`MAIR-1181 ${label} opens the messaging without a context and says so`, async () => {
    messageBff.on('get', '/link-suggestions', reply);
    await arrive();
    await view.waitFor(() => /Le projet lié n’est pas accessible/.test(view.html));

    assert.match(view.html, /La messagerie s’ouvre sans contexte\./);
    assert.equal(contextOf(), undefined);
    assert.equal(view.props('NewMessageModal')?.isOpen ?? false, false);
    assert.doesNotMatch(view.html, /aria-label="Message contextuel"/);
  });
}

test('MAIR-1181 without a context the page reads no suggestion and opens no modal', async () => {
  await arrive('?context=task-3');
  await view.settle();
  assert.equal(messageBff.calls('/link-suggestions', 'GET').length, 0);
  assert.equal(contextOf(), undefined);
  assert.equal(view.props('NewMessageModal')?.isOpen ?? false, false);
});
