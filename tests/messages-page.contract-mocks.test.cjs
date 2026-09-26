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
const Page = requireSrc('app/page.tsx').default;
const { messageClient } = requireSrc('clients/messageClient.ts');

const messageBff = messageBffMock();
const network = new FrontNetwork([messageBff]);
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
  delete process.env.MESSAGE_BFF_URL;
  delete process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL;
  process.env.BFF_MESSAGE_BASE_URL = messageBff.url;
  network.install();
});
after(async () => {
  network.restore();
  browser.restore();
  await messageBff.stop();
});
beforeEach(() => {
  messageBff.reset();
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
  assert.deepEqual([...messageBff.violations.filter((line) => !KNOWN_CONTRACT_DEFECTS.some((known) => known.test(line))), ...network.violations], []);
});

const upstream = () => messageBff.requests.map((call) => `${call.method} ${call.url.pathname}`).sort();

async function renderLoadedPage(body = bootstrap()) {
  messageBff.on('get', '/messaging/bootstrap', { body });
  view = mount(React.createElement(Page));
  return view.waitFor(() => view.props('Messaging').emptyStateLabel === 'Aucune conversation' &&
    view.props('Header').user.name !== 'Chargement…' &&
    view.props('Messaging').conversations[0]?.unreadCount === 0);
}

// Observe completion without replacing the real client, Next.js route or contract mock.
function trackReferenceRequests(t) {
  const original = messageClient.getBusinessReferences;
  const pending = [];
  t.mock.method(messageClient, 'getBusinessReferences', () => {
    const request = original();
    pending.push(request);
    return request;
  });
  return pending;
}

test('focus replaces business suggestions with the current BFF response, including an empty list', async (t) => {
  const pending = trackReferenceRequests(t);
  await renderLoadedPage();
  await Promise.allSettled(pending);
  const updated = businessReferences();
  updated.references[0].title = 'Projet actualisé';
  messageBff.on('get', '/business-references', { body: updated });

  browser.focus();
  await view.waitFor(() => view.props('Messaging').businessReferences[0]?.title === 'Projet actualisé');
  assert.equal(pending.length, 2);
  assert.equal(browser.window.location.reloads, 0);

  messageBff.on('get', '/business-references', { body: { ...updated, references: [] } });
  browser.focus();
  await view.waitFor(() => view.props('Messaging').businessReferences.length === 0);
  assert.equal(pending.length, 3);
  assert.match(view.text(), /Bonjour à tous/);
});

test('business suggestions wait for visibility and do not add periodic background requests', async (t) => {
  const pending = trackReferenceRequests(t);
  browser.setHidden(true);
  messageBff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.props('Messaging').emptyStateLabel === 'Aucune conversation');
  browser.focus();
  browser.tickIntervals(10_000);
  assert.equal(pending.length, 0);

  browser.setHidden(false);
  await view.waitFor(() => view.props('Messaging').businessReferences.length === 2);
  assert.equal(pending.length, 1);
  browser.tickIntervals(10_000);
  assert.equal(pending.length, 1);
});

test('failed initial business suggestions stay empty and recover on focus', async (t) => {
  const pending = trackReferenceRequests(t);
  messageBff.on('get', '/business-references', { status: 503, body: apiError('UNAVAILABLE', 'Indisponible'), outOfContract: true });
  await renderLoadedPage();
  await Promise.allSettled(pending);
  await view.settle();
  assert.deepEqual(view.props('Messaging').businessReferences, []);

  messageBff.on('get', '/business-references', { body: businessReferences() });
  browser.focus();
  await view.waitFor(() => view.props('Messaging').businessReferences.length === 2);
});

test('temporary business reference failures preserve the last successful suggestions', async (t) => {
  const pending = trackReferenceRequests(t);
  await renderLoadedPage();
  await Promise.allSettled(pending);
  const known = view.props('Messaging').businessReferences;

  for (const reply of [
    { status: 503, body: apiError('UNAVAILABLE', 'Indisponible'), outOfContract: true },
    { dropConnection: true },
  ]) {
    messageBff.on('get', '/business-references', reply);
    browser.focus();
    await Promise.allSettled(pending);
    await view.settle();
    assert.deepEqual(view.props('Messaging').businessReferences, known);
  }

  const recovered = { ...businessReferences(), references: businessReferences().references.slice(1) };
  messageBff.on('get', '/business-references', { body: recovered });
  browser.focus();
  await view.waitFor(() => view.props('Messaging').businessReferences.length === 1);
});

for (const status of [401, 403]) {
  test(`business suggestions are cleared after an explicit ${status} access refusal`, async (t) => {
    const pending = trackReferenceRequests(t);
    await renderLoadedPage();
    await Promise.allSettled(pending);
    assert.equal(view.props('Messaging').businessReferences.length, 2);
    messageBff.on('get', '/business-references', { status, body: apiError('FORBIDDEN', 'Accès refusé'), outOfContract: true });

    browser.focus();
    await view.waitFor(() => view.props('Messaging').businessReferences.length === 0);
    assert.match(view.text(), /Bonjour à tous/);
  });
}

test('simultaneous focus and visibility events share an in-flight business reference request', async (t) => {
  const pending = trackReferenceRequests(t);
  await renderLoadedPage();
  await Promise.allSettled(pending);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  t.after(() => release());
  const updated = businessReferences();
  updated.references[0].title = 'Dernière réponse';
  messageBff.on('get', '/business-references', async () => {
    await gate;
    return { body: updated };
  });

  browser.focus();
  browser.setHidden(true);
  browser.setHidden(false);
  browser.focus();
  assert.equal(pending.length, 2);
  release();
  await view.waitFor(() => view.props('Messaging').businessReferences[0]?.title === 'Dernière réponse');
  browser.focus();
  assert.equal(pending.length, 3);
  await Promise.allSettled(pending);
});

test('unmount removes business reference listeners and ignores the pending response', async (t) => {
  const pending = trackReferenceRequests(t);
  await renderLoadedPage();
  await Promise.allSettled(pending);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  t.after(() => release());
  messageBff.on('get', '/business-references', async () => {
    await gate;
    return { body: { ...businessReferences(), references: [] } };
  });
  browser.focus();
  assert.equal(pending.length, 2);
  view.unmount();
  const updates = t.mock.method(view, 'invalidate');
  const passes = view.passes;
  browser.focus();
  browser.setHidden(true);
  browser.setHidden(false);
  release();
  await Promise.allSettled(pending);
  await view.settle();

  assert.equal(pending.length, 2);
  assert.equal(updates.mock.callCount(), 0);
  assert.equal(view.passes, passes);
  assert.equal(view.props('Messaging').businessReferences.length, 2);
});

test('the first pass renders the empty messaging, the next ones the bootstrap, contacts and session', async () => {
  messageBff.on('get', '/messaging/bootstrap', { body: bootstrap() });
  view = mount(React.createElement(Page));

  assert.equal(view.passes, 1);
  assert.deepEqual(view.props('Messaging').conversations, []);
  assert.equal(view.props('Messaging').emptyStateLabel, 'Chargement de la messagerie...');
  assert.equal(view.props('Messaging').style, undefined);
  assert.match(view.html, /messages-app-root messages-app-root--bounded/);
  assert.doesNotMatch(view.text(), /Équipe communication/);

  const html = await view.waitFor(() => view.props('Messaging').emptyStateLabel === 'Aucune conversation');

  assert.ok(upstream().includes('GET /conversations'));
  assert.ok(upstream().includes('GET /messaging/bootstrap'));
  assert.doesNotMatch(html, /role="alert"/);
  assert.match(view.text(), /Équipe communication/);
  assert.match(view.text(), /Sophie Leroy/);
  assert.match(view.text(), /Bonjour à tous/);
  const messaging = view.props('Messaging');
  assert.equal(messaging.activeConversationId, 'conversation-4');
  assert.equal(messaging.currentUserId, 'user-2');
  assert.equal(messaging.emptyStateLabel, 'Aucune conversation');
  assert.deepEqual(messaging.contacts.map((item) => item.name), ['Sophie Leroy', 'Thomas Bernard']);
  assert.deepEqual(messaging.businessReferences.map((reference) => reference.title), ['Budget participatif', 'Conseil municipal']);
  await view.waitFor(() => view.props('Header').user.name === 'Agent Mairie');
  assert.match(view.html, /<span[^>]*>Agent Mairie<\/span>/);
  assert.match(view.html, /<footer/);
});

test('the sidebar keeps Settings as the only account entry', async () => {
  await renderLoadedPage();
  const ids = view.props('Sidebar').items.map((item) => item.id);
  assert.equal(ids.includes('profile'), false);
  assert.equal(ids.filter((id) => id === 'settings').length, 1);
});

test('a bootstrap failure is rendered as an alert and the messaging stays empty', async () => {
  messageBff.on('get', '/messaging/bootstrap', { status: 503, body: apiError('BFF_UNAVAILABLE', 'La messagerie est en maintenance'), outOfContract: true });
  view = mount(React.createElement(Page));

  const html = await view.waitFor((current) => current.includes('role="alert"'));

  assert.match(html, /<p role="alert" class="messages-error">La messagerie est en maintenance<\/p>/);
  await view.waitFor(() => view.props('Messaging').emptyStateLabel === 'Aucune conversation');
  assert.deepEqual(view.props('Messaging').conversations, []);
  assert.doesNotMatch(view.text(), /Équipe communication/);
});

test('selecting a conversation loads its messages and renders them', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: { conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }), messages: [message(2, 5, 'Salut, tu as vu le dossier ?', users.sophie), message(3, 5, 'Oui, je relis.')] },
  }));

  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy', { kind: 'direct' })));
  const html = await view.waitFor((current) => current.includes('Oui, je relis.'));

  assert.ok(messageBff.calls('/conversations/{conversationId}/messages').some((call) =>
    call.pathParams.conversationId === 'conversation-5'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.match(html, /Salut, tu as vu le dossier \?/);
  assert.doesNotMatch(html, /role="alert"/);
});

test('a conversation URL opens the authorized BFF thread without changing the default journey', async () => {
  browser.window.location.search = '?conversation=conversation-5';
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({
    body: {
      conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }),
      messages: [message(7, 5, 'Message ciblé', users.sophie)],
    },
  }));

  await renderLoadedPage();

  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.match(view.text(), /Message ciblé/);
  assert.ok(messageBff.calls('/conversations/{conversationId}/messages').some((call) =>
    call.pathParams.conversationId === 'conversation-5'));
  assert.deepEqual(view.props('Messaging').conversations.map((item) => item.id), ['conversation-4', 'conversation-5']);
});

test('an inaccessible conversation URL keeps the real bootstrap and reports the failed target', async () => {
  browser.window.location.search = '?conversation=conversation-999';
  messageBff.on('get', '/conversations/{conversationId}/messages', (request) =>
    request.pathParams.conversationId === 'conversation-999'
      ? { status: 404, body: apiError('NOT_FOUND', 'Conversation introuvable'), outOfContract: true }
      : swappedModel({ body: {
          conversation: conversation(4, 'Équipe communication'),
          messages: [message(1, 4, 'Bonjour à tous', users.sophie)],
        } }),
  );

  await renderLoadedPage();

  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.match(view.text(), /Bonjour à tous/);
  assert.match(view.text(), /La conversation demandée est introuvable ou inaccessible/);
  assert.equal(view.props('Messaging').conversations.length, 2);
});

test('sending a message posts it to the BFF and appends the answer to the thread', async () => {
  await renderLoadedPage();
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({
    status: 201,
    body: { message: message(3, 4, 'Réunion à 14h'), conversation: conversation(4, 'Équipe communication', { lastMessage: 'Réunion à 14h' }) },
  }));

  await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-4', content: 'Réunion à 14h', attachments: [], mentions: [] }));
  const html = await view.waitFor((current) => current.includes('Réunion à 14h'));

  const [call] = messageBff.calls('/conversations/{conversationId}/messages', 'POST');
  assert.deepEqual(call.pathParams, { conversationId: 'conversation-4' });
  assert.deepEqual(call.body, { content: 'Réunion à 14h', attachmentIds: [], mentionIds: [] });
  assert.match(html, /Bonjour à tous/);
  assert.equal(view.props('Messaging').messages.length, 2);
});

test('a refused send is shown as an alert without losing the thread', async () => {
  await renderLoadedPage();
  messageBff.on('post', '/conversations/{conversationId}/messages', { status: 403, body: apiError('FORBIDDEN', 'Vous ne faites plus partie de cette conversation'), outOfContract: true });

  await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-4', content: 'Encore là ?', attachments: [], mentions: [] }));
  const html = await view.waitFor((current) => current.includes('role="alert"'));

  assert.match(html, /<p role="alert" class="messages-error">Vous ne faites plus partie de cette conversation<\/p>/);
  assert.match(html, /Bonjour à tous/);
  assert.doesNotMatch(html, /Encore là \?/);
});

test('focus refreshes the real conversation list and active thread without duplicates', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations', { body: { conversations: [
    conversation(4, 'Équipe communication', { lastMessage: 'Nouveau du serveur' }),
    conversation(6, 'Nouveau groupe', { unreadCount: 1 }),
  ] } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
    conversation: conversation(4, 'Équipe communication'),
    messages: [message(1, 4, 'Bonjour à tous', users.sophie), message(3, 4, 'Nouveau du serveur', users.sophie)],
  } }));

  browser.focus();
  await view.waitFor(() => view.props('Messaging').messages.some((item) => item.id === 'message-3'));

  assert.deepEqual(view.props('Messaging').conversations.map((item) => item.id), ['conversation-4', 'conversation-6']);
  assert.deepEqual(view.props('Messaging').messages.map((item) => item.id), ['message-1', 'message-3']);
  assert.match(view.text(), /Nouveau du serveur/);
});

test('the visible-page interval refreshes conversations from the BFF', async () => {
  await renderLoadedPage();
  const previousListCalls = messageBff.calls('/conversations').length;
  messageBff.on('get', '/conversations', { body: { conversations: [
    conversation(4, 'Équipe communication'), conversation(8, 'Synchronisé'),
  ] } });

  browser.tickIntervals(10_000);
  await view.waitFor(() => view.props('Messaging').conversations.some((item) => item.id === 'conversation-8'));

  assert.equal(messageBff.calls('/conversations').length, previousListCalls + 1);
});

test('refresh keeps the BFF unread count without calling the non-persistent read route', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations', { body: { conversations: [
    conversation(4, 'Équipe communication', { unreadCount: 2 }),
  ] } });

  browser.focus();
  await view.waitFor(() => view.props('Messaging').conversations[0]?.unreadCount === 2);

  assert.equal(messageBff.calls('/conversations/{conversationId}/read').length, 0);
});

test('a hidden tab does not refresh messages, then refreshes when shown', async () => {
  await renderLoadedPage();
  const previousListCalls = messageBff.calls('/conversations').length;
  browser.setHidden(true);
  browser.focus();
  assert.equal(messageBff.calls('/conversations').length, previousListCalls);

  messageBff.on('get', '/conversations', { body: { conversations: [
    conversation(4, 'Équipe communication'), conversation(7, 'Retour visible'),
  ] } });
  browser.setHidden(false);
  await view.waitFor(() => view.props('Messaging').conversations.some((item) => item.id === 'conversation-7'));
  assert.equal(messageBff.calls('/conversations').length, previousListCalls + 1);
});

test('a failed refresh preserves the known thread and recovers on focus', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations', { status: 503, body: apiError('BFF_UNAVAILABLE', 'Indisponible'), outOfContract: true });
  browser.focus();
  await view.waitFor((html) => html.includes('La synchronisation des conversations est momentanément indisponible.'));
  assert.match(view.text(), /Bonjour à tous/);
  assert.equal(view.props('Messaging').conversations.length, 2);

  messageBff.on('get', '/conversations', { body: { conversations: [conversation(4, 'Équipe communication')] } });
  browser.focus();
  await view.waitFor((html) => !html.includes('La synchronisation des conversations est momentanément indisponible.') &&
    view.props('Messaging').conversations.length === 1);
});

test('a stale refresh cannot erase a message sent while it was in flight', async () => {
  await renderLoadedPage();
  let release;
  let responded = false;
  const gate = new Promise((resolve) => { release = resolve; });
  messageBff.on('get', '/conversations', async () => {
    await gate;
    responded = true;
    return { body: { conversations: [conversation(4, 'Équipe communication')] } };
  });
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({
    status: 201,
    body: { message: message(9, 4, 'Envoyé pendant le rafraîchissement'), conversation: conversation(4, 'Équipe communication') },
  }));
  browser.focus();
  await view.waitFor(() => messageBff.calls('/conversations').length === 2);
  await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-4', content: 'Envoyé pendant le rafraîchissement', attachments: [], mentions: [] }));
  release();
  await view.waitFor(() => responded && view.props('Messaging').messages.some((item) => item.id === 'message-9'));
  assert.equal(view.props('Messaging').messages.filter((item) => item.id === 'message-9').length, 1);
});

test('a stale refresh cannot replace a newly selected thread', async () => {
  await renderLoadedPage();
  let release;
  let responded = false;
  const gate = new Promise((resolve) => { release = resolve; });
  messageBff.on('get', '/conversations', async () => {
    await gate;
    responded = true;
    return { body: { conversations: bootstrap().conversations } };
  });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
    conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }),
    messages: [message(8, 5, 'Fil sélectionné', users.sophie)],
  } }));
  browser.focus();
  await view.waitFor(() => messageBff.calls('/conversations').length === 2);
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy', { kind: 'direct' })));
  release();
  await view.waitFor(() => responded && view.props('Messaging').messages.some((item) => item.id === 'message-8'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.match(view.text(), /Fil sélectionné/);
});

test('a stale refresh cannot restore a deleted conversation', async () => {
  await renderLoadedPage();
  let release;
  let responded = false;
  const gate = new Promise((resolve) => { release = resolve; });
  messageBff.on('get', '/conversations', async () => {
    await gate;
    responded = true;
    return { body: { conversations: bootstrap().conversations } };
  });
  messageBff.on('delete', '/conversations/{conversationId}', {
    body: { deleted: true, conversationId: 'conversation-4' },
  });
  browser.focus();
  await view.waitFor(() => messageBff.calls('/conversations').length === 2);
  await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));
  release();
  await view.waitFor(() => responded && view.props('Messaging').conversations.length === 1);
  assert.deepEqual(view.props('Messaging').conversations.map((item) => item.id), ['conversation-5']);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
});
