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

const frenchTime = (value) => new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

test('bootstrap renders French timestamp labels without modifying message text or source data', async () => {
  browser.setHidden(true); // Inspect bootstrap before the independent visible-tab refresh.
  const body = bootstrap();
  const timestamp = '2026-09-26T23:30:00Z';
  body.conversations[0] = conversation(4, 'Équipe communication', { lastMessageAt: timestamp });
  body.messages[0] = message(1, 4, 'Rendez-vous à 9 h 05', users.sophie, { sentAt: timestamp });
  await renderLoadedPage(body);

  assert.equal(view.props('Messaging').conversations[0].lastMessageAt, frenchTime(timestamp));
  assert.equal(view.props('Messaging').messages[0].sentAt, frenchTime(timestamp));
  assert.equal(body.messages[0].content, 'Rendez-vous à 9 h 05');
  assert.match(view.text(), /Sophie Leroy/);
  assert.match(view.text(), /Rendez-vous à 9 h 05/);
  assert.ok(view.text().includes(frenchTime(timestamp)));
  assert.equal(body.messages[0].sentAt, timestamp);
  assert.equal(body.conversations[0].lastMessageAt, timestamp);
  assert.doesNotMatch(view.text(), /2026-09-26T23:30:00Z/);
});

test('selection renders legacy times and preserves unknown or absent timestamp labels', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
    conversation: conversation(5, 'Sophie Leroy', { kind: 'direct', lastMessageAt: '09 h 45' }),
    messages: [
      message(2, 5, 'Heure transmise', users.sophie, { sentAt: '09 h 45' }),
      message(3, 5, 'Sans horodatage', users.sophie, { sentAt: undefined }),
      message(4, 5, 'Valeur inconnue', users.sophie, { sentAt: 'Hier' }),
    ],
  } }));
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-4'));
  const selected = view.props('Messaging').messages.filter(item => item.conversationId === 'conversation-5');
  assert.deepEqual(selected.map(item => item.sentAt), ['09:45', undefined, 'Hier']);
  assert.equal(view.props('Messaging').conversations.find(item => item.id === 'conversation-5').lastMessageAt, '09:45');
  assert.match(view.text(), /09:45/);
  assert.match(view.text(), /Sans horodatage/);
  assert.doesNotMatch(view.text(), /Invalid Date/);
});

test('focus refresh formats new timestamps without changing BFF ordering or unread counts', async () => {
  await renderLoadedPage();
  const timestamp = '2026-09-27T08:15:00+04:00';
  const refreshed = conversation(4, 'Équipe communication', { lastMessageAt: timestamp, unreadCount: 3 });
  messageBff.on('get', '/conversations', { body: { conversations: [refreshed, conversation(6, 'Autre groupe')] } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
    conversation: refreshed,
    messages: [message(10, 4, 'Message actualisé', users.sophie, { sentAt: timestamp })],
  } }));
  browser.focus();
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-10'));
  assert.equal(view.props('Messaging').messages[0].sentAt, frenchTime(timestamp));
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-4', 'conversation-6']);
  assert.equal(view.props('Messaging').conversations[0].lastMessageAt, frenchTime(timestamp));
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
});

test('send keeps user-authored date text and request payload intact, then formats only the BFF reply', async () => {
  await renderLoadedPage();
  const timestamp = '2026-09-26T14:00:00Z';
  const content = 'Réunion à 9 h 05, référence 2026-09-26T14:00:00Z';
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
    message: message(3, 4, content, users.agent, { sentAt: timestamp }),
    conversation: conversation(4, 'Équipe communication', { lastMessage: content, lastMessageAt: timestamp }),
  } }));
  await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-4', content, attachments: [], mentions: [] }));
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-3'));
  assert.deepEqual(messageBff.calls('/conversations/{conversationId}/messages', 'POST')[0].body,
    { content, attachmentIds: [], mentionIds: [] });
  assert.equal(view.props('Messaging').messages.find(item => item.id === 'message-3').sentAt, frenchTime(timestamp));
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'POST')[0].body.content, content);
  assert.match(view.text(), /Agent Mairie \(vous\)/);
  assert.match(view.text(), /Réunion à 9 h 05/);
  assert.equal(view.props('Messaging').conversations[0].lastMessage, content);
  assert.equal(view.props('Messaging').conversations[0].lastMessageAt, frenchTime(timestamp));
});

test('selected files are uploaded before their server IDs are attached to a message', async (t) => {
  await renderLoadedPage();
  const revokePreview = t.mock.method(URL, 'revokeObjectURL');
  const attachment = { id: 'agenda.txt-123-0', name: 'agenda.txt', size: 6, type: 'text/plain', url: 'blob:sent-agenda' };
  const file = new File(['agenda'], 'agenda.txt', { type: 'text/plain' });
  await view.act(() => view.props('Messaging').onAttach([file], [attachment]));
  messageBff.on('post', '/attachments', { status: 201, body: {
    attachments: [{ id: 'stored-42', name: 'agenda.txt', size: 6, type: 'text/plain' }],
  } });
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
    message: message(3, 4, 'Voici le document', users.agent),
    conversation: conversation(4, 'Équipe communication', { lastMessage: 'Voici le document' }),
  } }));

  const sendResult = await view.act(() => view.props('Messaging').onSendMessage({
    conversationId: 'conversation-4', content: 'Voici le document', attachments: [attachment], mentions: [],
  }));
  assert.equal(sendResult, true);
  await view.waitFor(() => view.props('Messaging').messages.some((item) => item.id === 'message-3'));

  const writes = messageBff.requests.filter((call) => call.method === 'POST');
  assert.deepEqual(writes.map((call) => call.template), ['/attachments', '/conversations/{conversationId}/messages']);
  assert.match(writes[0].headers['content-type'], /^multipart\/form-data; boundary=/);
  assert.deepEqual(writes[1].body, { content: 'Voici le document', attachmentIds: ['stored-42'], mentionIds: [] });
  assert.doesNotMatch(JSON.stringify(writes[1].body), /agenda\.txt-123-0/);
  assert.equal(revokePreview.mock.callCount(), 1);
  assert.equal(revokePreview.mock.calls[0].arguments[0], 'blob:sent-agenda');
});

test('failed or unregistered file uploads never send a message with a local attachment ID', async (t) => {
  await renderLoadedPage();
  const revokePreview = t.mock.method(URL, 'revokeObjectURL');
  const attachment = { id: 'agenda.txt-123-0', name: 'agenda.txt', size: 6, type: 'text/plain', url: 'blob:retry-agenda' };
  const missingFileResult = await view.act(() => view.props('Messaging').onSendMessage({
    conversationId: 'conversation-4', content: 'Sans fichier réel', attachments: [attachment], mentions: [],
  }));
  assert.equal(missingFileResult, false);
  await view.waitFor((html) => html.includes('La pièce jointe sélectionnée est indisponible'));
  assert.equal(messageBff.calls('/attachments', 'post').length, 0);
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'post').length, 0);

  const file = new File(['agenda'], 'agenda.txt', { type: 'text/plain' });
  await view.act(() => view.props('Messaging').onAttach([file], [attachment]));
  messageBff.on('post', '/attachments', { status: 401, body: apiError('UNAUTHORIZED', 'Envoi du fichier refusé') });
  const refusedUploadResult = await view.act(() => view.props('Messaging').onSendMessage({
    conversationId: 'conversation-4', content: 'Sans fichier enregistré', attachments: [attachment], mentions: [],
  }));
  assert.equal(refusedUploadResult, false);
  await view.waitFor((html) => html.includes('Envoi du fichier refusé'));
  assert.equal(messageBff.calls('/attachments', 'post').length, 1);
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'post').length, 0);
  assert.equal(revokePreview.mock.callCount(), 0);
});

test('an upload response without an ID cannot be mistaken for a sent attachment', async () => {
  await renderLoadedPage();
  const attachment = { id: 'agenda.txt-123-0', name: 'agenda.txt', size: 6, type: 'text/plain' };
  const file = new File(['agenda'], 'agenda.txt', { type: 'text/plain' });
  await view.act(() => view.props('Messaging').onAttach([file], [attachment]));
  messageBff.on('post', '/attachments', { status: 201, body: { attachments: [] } });

  await view.act(() => view.props('Messaging').onSendMessage({
    conversationId: 'conversation-4', content: 'Fichier non confirmé', attachments: [attachment], mentions: [],
  }));
  await view.waitFor((html) => html.includes('Le transfert des pièces jointes n’a pas été confirmé'));

  assert.equal(messageBff.calls('/attachments', 'post').length, 1);
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'post').length, 0);
});

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
  assert.match(view.html, /messages-app-root/);
  assert.match(view.html, /messages-main-inner/);
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
  const footer = view.html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer);
  assert.match(view.html, /<aside\b[^]*?<footer\b[^]*?<\/footer>[^]*?<\/aside>/);
  assert.doesNotMatch(view.html, /<\/main>\s*<footer\b/);
  assert.match(footer.replace(/<[^>]*>/g, ''), new RegExp(`© ${new Date().getFullYear()} Mairie360`));
  assert.doesNotMatch(footer, /Version|<button\b|<a\b/);
});

test('narrow screens can switch to the conversation list and return to the selected thread', async () => {
  await renderLoadedPage();

  assert.match(view.html, /Voir les conversations/);
  assert.doesNotMatch(view.html, /messages-list-open/);

  await view.act(() => view.props('MobileConversationSwitch').onToggle());
  assert.match(view.html, /messages-list-open/);
  assert.match(view.html, /Retour à la conversation/);

  await view.act(() => view.props('Messaging').onConversationSelect(conversation(4, 'Équipe communication')));
  await view.waitFor(() => !view.html.includes('messages-list-open'));
  assert.match(view.html, /Voir les conversations/);
});

test('desktop and mobile navigation expose only active modules and keep Settings functional', async () => {
  const { setBrowserFrontUrls } = requireSrc('lib/front-urls.ts');
  const assigned = [];
  const originalAssign = global.window.location.assign;
  global.window.location.assign = (href) => assigned.push(href);
  setBrowserFrontUrls({
    DASHBOARD_FRONT_URL: 'https://dashboard.test.example/',
    PROJECT_FRONT_URL: 'https://projects.test.example/',
    MESSAGE_FRONT_URL: 'https://messages.test.example/',
    ELEARNING_FRONT_URL: 'https://training.test.example/',
    CALENDAR_FRONT_URL: 'https://calendar.test.example/',
    ADMINISTRATION_FRONT_URL: 'https://admin.test.example/',
    SETTINGS_FRONT_URL: 'https://settings.test.example/',
  });
  try {
    await renderLoadedPage();
    assert.equal(view.props('Header').profileHref, 'https://settings.test.example/');
    const isAdmin = view.props('Sidebar').isAdmin;
    for (const mobileOpen of [false, true]) {
      await view.act(() => view.props('Header').setSidebarOpen(mobileOpen));
      const sidebars = view.find('Sidebar');
      assert.equal(sidebars.length, mobileOpen ? 2 : 1);
      for (const { props } of sidebars) {
        assert.deepEqual(props.items.map(item => item.id),
          ['dashboard', 'projects', 'messages', 'training', 'calendar', 'admin', 'settings']);
        assert.equal(props.items.find(item => item.id === 'admin').adminOnly, true);
        assert.equal(props.isAdmin, isAdmin);
        assert.equal(props.activeItem, 'messages');
      }
      const menus = view.html.match(/<nav\b[^>]*aria-label="Menu principal"[^>]*>[\s\S]*?<\/nav>/g) ?? [];
      assert.equal(menus.length, sidebars.length);
      for (const menu of menus) {
        assert.doesNotMatch(menu, /E-mails|Fichiers/);
        assert.match(menu, /Paramètres/);
        assert.equal(menu.includes('>Administration<'), isAdmin);
      }
    }
    const mobileSidebar = view.find('Sidebar')[1].props;
    await view.act(() => mobileSidebar.onItemSelect(mobileSidebar.items.find(item => item.id === 'settings')));
    assert.deepEqual(assigned, ['https://settings.test.example/']);
    await view.act(() => view.props('Header').onPageChange('profile'));
    assert.deepEqual(assigned, ['https://settings.test.example/', 'https://settings.test.example/']);
    assert.equal(view.find('Sidebar').length, 1);
  } finally {
    setBrowserFrontUrls({});
    global.window.location.assign = originalAssign;
  }
});

test('the sidebar keeps Settings as the only account entry', async () => {
  const { setBrowserFrontUrls } = requireSrc('lib/front-urls.ts');
  setBrowserFrontUrls({ SETTINGS_FRONT_URL: 'https://settings.test.example/' });
  try {
    await renderLoadedPage();
    const ids = view.props('Sidebar').items.map((item) => item.id);
    assert.equal(ids.includes('profile'), false);
    assert.equal(ids.filter((id) => id === 'settings').length, 1);
  } finally {
    setBrowserFrontUrls({});
  }
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

  const sendResult = await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-4', content: 'Encore là ?', attachments: [], mentions: [] }));
  assert.equal(sendResult, false);
  const html = await view.waitFor((current) => current.includes('role="alert"'));

  assert.match(html, /<p role="alert" class="messages-error">Vous ne faites plus partie de cette conversation<\/p>/);
  assert.match(html, /Bonjour à tous/);
  assert.doesNotMatch(html, /Encore là \?/);
});

test('a refused direct message returns failure and preserves the selected conversation', async () => {
  await renderLoadedPage();
  messageBff.on('post', '/direct-messages', { status: 403, body: apiError('FORBIDDEN', 'Message direct refusé'), outOfContract: true });
  const result = await view.act(() => view.props('Messaging').onNewMessageSend({
    recipientId: `user-${users.thomas.id}`, message: 'Bonjour Thomas',
  }));

  assert.equal(result, false);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.match(view.text(), /Message direct refusé/);
});

test('group creation exposes the pending promise and confirms only the BFF-created conversation', async () => {
  await renderLoadedPage();
  let reply;
  messageBff.on('post', '/groups', () => new Promise((resolve) => { reply = resolve; }));
  const payload = { name: 'Groupe confirmé', description: 'Depuis le formulaire', memberIds: [`user-${users.sophie.id}`] };
  const pending = view.props('Messaging').onCreateGroup(payload);
  assert.equal(typeof pending?.then, 'function', 'the library must receive the actual service promise');
  await view.waitFor(() => typeof reply === 'function');
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.equal(view.props('Messaging').conversations.length, 2, 'no optimistic group is invented');

  reply({ status: 201, body: { conversation: conversation(6, payload.name) } });
  assert.equal(await pending, true);
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-6');
  assert.equal(view.props('Messaging').conversations.length, 3);
  const [call] = messageBff.calls('/groups', 'POST');
  assert.deepEqual(call.body, payload);
});

test('refused group creation returns false, preserves the existing thread and supports retry', async () => {
  await renderLoadedPage();
  const payload = { name: 'Groupe à réessayer', description: 'Conservée', memberIds: [`user-${users.sophie.id}`] };
  messageBff.on('post', '/groups', { status: 503, body: apiError('UNAVAILABLE', 'Création indisponible'), outOfContract: true });
  const refused = await view.act(() => view.props('Messaging').onCreateGroup(payload));
  assert.equal(refused, false);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.equal(view.props('Messaging').conversations.length, 2);
  assert.match(view.text(), /Création indisponible/);
  assert.match(view.text(), /Bonjour à tous/);

  messageBff.on('post', '/groups', { status: 201, body: { conversation: conversation(6, payload.name) } });
  const confirmed = await view.act(() => view.props('Messaging').onCreateGroup(payload));
  assert.equal(confirmed, true);
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-6');
  assert.doesNotMatch(view.text(), /Création indisponible/);
  assert.equal(messageBff.calls('/groups', 'POST').length, 2);
  assert.deepEqual(messageBff.calls('/groups', 'POST')[1].body, messageBff.calls('/groups', 'POST')[0].body);
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

for (const [label, reply] of [
  ['an empty 200 response', { raw: '', outOfContract: true }],
  ['a missing acknowledgement', { body: {}, outOfContract: true }],
  ['a false acknowledgement', { body: { deleted: false }, outOfContract: true }],
  ['a string acknowledgement', { body: { deleted: 'true' }, outOfContract: true }],
  ['a different conversation ID', { body: { deleted: true, conversationId: 'conversation-5' } }],
]) {
  test(`deletion preserves the selected conversation and messages after ${label}`, async () => {
    await renderLoadedPage();
    messageBff.on('delete', '/conversations/{conversationId}', reply);
    await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));

    assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-4', 'conversation-5']);
    assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
    assert.match(view.text(), /Bonjour à tous/);
    assert.match(view.html, /role="alert"[^]*?La suppression de la conversation n’a pas été confirmée/);
    assert.equal(typeof view.props('Messaging').onConversationDelete, 'function', 'retry is available');
  });
}

test('a confirmed deletion accepts the contract optional ID and preserves other messages', async () => {
  await renderLoadedPage();
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
    conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }),
    messages: [message(8, 5, 'Fil conservé', users.sophie)],
  } }));
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-8'));
  messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true } });
  await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));

  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.deepEqual(view.props('Messaging').messages.map(item => item.id), ['message-8']);
  assert.match(view.text(), /Fil conservé/);
  assert.doesNotMatch(view.text(), /La suppression de la conversation n’a pas été confirmée/);
});

test('a deletion refusal permits one guarded retry and preserves data while pending', async () => {
  await renderLoadedPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  messageBff.on('delete', '/conversations/{conversationId}', async () => {
    await gate;
    return { status: 503, body: apiError('UNAVAILABLE', 'Suppression momentanément refusée'), outOfContract: true };
  });
  const deleteHandler = view.props('Messaging').onConversationDelete;
  let attempts;
  await view.act(() => {
    attempts = [deleteHandler(conversation(4, 'Équipe communication')), deleteHandler(conversation(4, 'Équipe communication'))];
  });
  try {
    await view.waitFor(() => messageBff.calls('/conversations/{conversationId}', 'DELETE').length >= 1);
    assert.equal(messageBff.calls('/conversations/{conversationId}', 'DELETE').length, 1);
    assert.equal(view.props('Messaging').onConversationDelete, undefined);
    assert.match(view.html, /role="status"[^]*?Suppression de la conversation en cours/);
    assert.match(view.text(), /Bonjour à tous/);
    const reads = messageBff.calls('/conversations').length;
    browser.focus();
    browser.tickIntervals(10_000);
    assert.equal(messageBff.calls('/conversations').length, reads, 'no refresh races a pending delete');
  } finally {
    release();
    await Promise.all(attempts);
  }
  await view.waitFor(html => html.includes('Suppression momentanément refusée'));
  assert.equal(view.props('Messaging').conversations.length, 2);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-4');
  assert.equal(typeof view.props('Messaging').onConversationDelete, 'function');
  assert.doesNotMatch(view.text(), /Suppression de la conversation en cours/);

  messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true, conversationId: 'conversation-4' } });
  await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));
  assert.equal(messageBff.calls('/conversations/{conversationId}', 'DELETE').length, 2);
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.doesNotMatch(view.text(), /Suppression momentanément refusée|Suppression de la conversation en cours/);
});

test('a delayed deletion preserves a conversation selected while it was pending', async () => {
  await renderLoadedPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  messageBff.on('delete', '/conversations/{conversationId}', async () => {
    await gate;
    return { body: { deleted: true, conversationId: 'conversation-4' } };
  });
  let pending;
  await view.act(() => { pending = view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')); });
  try {
    await view.waitFor(() => messageBff.calls('/conversations/{conversationId}', 'DELETE').length === 1);
    messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: {
      conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }),
      messages: [message(8, 5, 'Sélection pendant suppression', users.sophie)],
    } }));
    await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
    await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-8'));
  } finally {
    release();
    await pending;
  }
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.match(view.text(), /Sélection pendant suppression/);
});

test('a newly selected thread may finish loading after another conversation is deleted', async () => {
  await renderLoadedPage();
  let releaseDelete;
  let releaseSelection;
  const deletionGate = new Promise(resolve => { releaseDelete = resolve; });
  const selectionGate = new Promise(resolve => { releaseSelection = resolve; });
  messageBff.on('delete', '/conversations/{conversationId}', async () => {
    await deletionGate;
    return { body: { deleted: true, conversationId: 'conversation-4' } };
  });
  messageBff.on('get', '/conversations/{conversationId}/messages', async () => {
    await selectionGate;
    return swappedModel({ body: {
      conversation: conversation(5, 'Sophie Leroy', { kind: 'direct' }),
      messages: [message(8, 5, 'Sélection chargée après suppression', users.sophie)],
    } });
  });
  let pendingDelete;
  await view.act(() => { pendingDelete = view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')); });
  try {
    await view.waitFor(() => messageBff.calls('/conversations/{conversationId}', 'DELETE').length === 1);
    await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
    await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-5');
    releaseDelete();
    await pendingDelete;
  } finally {
    releaseDelete();
    releaseSelection();
    await pendingDelete;
  }
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-8'));
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.match(view.text(), /Sélection chargée après suppression/);
});

test('a confirmed numeric ID removes the last conversation and returns to the mobile list', async () => {
  browser.setHidden(true);
  const body = bootstrap();
  body.conversations = [conversation(4, 'Dernier fil', { id: 4 })];
  body.activeConversationId = 4;
  body.messages = [message(1, 4, 'Dernier message', users.sophie, { conversationId: 4 })];
  await renderLoadedPage(body);
  messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true, conversationId: '4' } });
  await view.act(() => view.props('Messaging').onConversationDelete(body.conversations[0]));
  assert.deepEqual(view.props('Messaging').conversations, []);
  assert.deepEqual(view.props('Messaging').messages, []);
  assert.equal(view.props('Messaging').activeConversationId, '');
  assert.match(view.html, /messages-module-frame messages-list-open/);
  assert.match(view.text(), /Aucune conversation/);
  assert.doesNotMatch(view.text(), /Dernier message|Suppression de la conversation en cours/);
});

const fallbackThread = () => swappedModel({ body: {
  conversation: conversation(5, 'Sophie Leroy', { kind: 'direct', unreadCount: 3 }),
  messages: [message(20, 5, 'Historique officiel du fil suivant', users.sophie)],
} });

async function renderFallbackPage(body = bootstrap()) {
  // This helper observes bootstrap before polling; the existing helper expects zero unread.
  body.conversations[0].unreadCount = 0;
  return renderLoadedPage(body);
}

test('a confirmed active deletion immediately loads the fallback thread without another poll', async () => {
  browser.setHidden(true);
  await renderFallbackPage();
  messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true, conversationId: 'conversation-4' } });
  messageBff.on('get', '/conversations/{conversationId}/messages', fallbackThread());
  await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-20'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.match(view.text(), /Historique officiel du fil suivant/);
  assert.doesNotMatch(view.text(), /Bonjour à tous/);
  assert.deepEqual(messageBff.calls('/conversations/{conversationId}/messages').map(call => call.pathParams.conversationId), ['conversation-5']);
  assert.equal(messageBff.calls('/conversations/{conversationId}/read').length, 0);
  assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
});

for (const label of ['disappeared active thread', 'new first conversation']) {
  test(`one visible refresh loads the ${label} fallback immediately`, async () => {
    browser.setHidden(true);
    const body = bootstrap();
    if (label === 'new first conversation') {
      body.conversations = [];
      body.messages = [];
      body.activeConversationId = '';
    }
    messageBff.on('get', '/messaging/bootstrap', { body });
    view = mount(React.createElement(Page));
    await view.waitFor(() => view.props('Header').user.name !== 'Chargement…' && view.props('Messaging').emptyStateLabel === 'Aucune conversation');
    messageBff.on('get', '/conversations', { body: { conversations: [fallbackThread().body.conversation] } });
    messageBff.on('get', '/conversations/{conversationId}/messages', fallbackThread());
    browser.setHidden(false);
    await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-20'));
    assert.equal(messageBff.calls('/conversations').length, 1, 'same refresh, not another ten-second interval');
    assert.equal(messageBff.calls('/conversations/{conversationId}/messages').length, 1);
    assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
    assert.equal(view.props('Messaging').conversations[0].unreadCount, 3);
    assert.doesNotMatch(view.text(), /Bonjour à tous/);
    assert.equal(messageBff.calls('/conversations/{conversationId}/read').length, 0);
  });
}

for (const mode of ['delete', 'sync']) {
  test(`a refused ${mode} fallback read preserves known remaining messages and recovers on selection`, async () => {
    browser.setHidden(true);
    const body = bootstrap();
    body.messages.push(message(19, 5, 'Historique déjà connu', users.sophie));
    await renderFallbackPage(body);
    messageBff.on('get', '/conversations/{conversationId}/messages', { status: 503, body: apiError('UNAVAILABLE', 'Historique momentanément indisponible'), outOfContract: true });
    if (mode === 'delete') {
      messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true } });
      await view.act(() => view.props('Messaging').onConversationDelete(body.conversations[0]));
    } else {
      messageBff.on('get', '/conversations', { body: { conversations: [body.conversations[1]] } });
      browser.setHidden(false);
    }
    await view.waitFor(html => html.includes('role="alert"') && view.props('Messaging').activeConversationId === 'conversation-5');
    assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
    assert.match(view.text(), /Historique déjà connu/);
    assert.doesNotMatch(view.text(), /Bonjour à tous/);
    assert.equal(messageBff.calls('/conversations/{conversationId}/messages').length, 1);
    messageBff.on('get', '/conversations/{conversationId}/messages', fallbackThread());
    await view.act(() => view.props('Messaging').onConversationSelect(body.conversations[1]));
    await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-20'));
    assert.doesNotMatch(view.html, /role="alert"/);
    assert.equal(messageBff.calls('/conversations/{conversationId}/messages').length, 2);
    assert.equal(messageBff.calls('/conversations/{conversationId}/read').length, 0);
  });
}

test('a selected read carrying another conversation ID cannot resurrect a removed thread', async () => {
  browser.setHidden(true);
  await renderFallbackPage();
  messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true } });
  // The default mock returns conversation-4 even though fallback requests conversation-5.
  await view.act(() => view.props('Messaging').onConversationDelete(conversation(4, 'Équipe communication')));
  await view.act(() => view.props('Messaging').onConversationSelect(conversation(5, 'Sophie Leroy')));
  await view.waitFor(html => html.includes('role="alert"'));
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.doesNotMatch(view.text(), /Bonjour à tous/);
});

for (const outcome of ['success', 'refusal']) {
  test(`a late fallback ${outcome} cannot replace a newer selected thread`, async () => {
    browser.setHidden(true);
    const body = bootstrap();
    body.conversations.push(conversation(6, 'Troisième fil'));
    await renderFallbackPage(body);
    let release;
    let responded = false;
    const gate = new Promise(resolve => { release = resolve; });
    messageBff.on('get', '/conversations', { body: { conversations: body.conversations.slice(1) } });
    messageBff.on('get', '/conversations/{conversationId}/messages', async call => {
      if (call.pathParams.conversationId === 'conversation-5') {
        await gate;
        responded = true;
        return outcome === 'success' ? fallbackThread() : { status: 503, body: apiError('UNAVAILABLE', 'Refus tardif'), outOfContract: true };
      }
      return swappedModel({ body: { conversation: body.conversations[2], messages: [message(21, 6, 'Sélection plus récente', users.thomas)] } });
    });
    browser.setHidden(false);
    try {
      await view.waitFor(() => messageBff.calls('/conversations/{conversationId}/messages').length === 1);
      await view.act(() => view.props('Messaging').onConversationSelect(body.conversations[2]));
      await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-21'));
    } finally {
      release();
    }
    await view.waitFor(() => responded);
    assert.equal(view.props('Messaging').activeConversationId, 'conversation-6');
    assert.match(view.text(), /Sélection plus récente/);
    assert.doesNotMatch(view.html, /role="alert"/);
    assert.equal(view.props('Messaging').messages.some(item => item.id === 'message-20'), false);
  });
}

for (const action of ['send', 'delete']) {
  test(`a fallback read cannot overwrite a newer confirmed ${action} in that thread`, async () => {
    browser.setHidden(true);
    const body = bootstrap();
    body.conversations.push(conversation(6, 'Troisième fil'));
    await renderFallbackPage(body);
    let release;
    let responded = false;
    const gate = new Promise(resolve => { release = resolve; });
    messageBff.on('delete', '/conversations/{conversationId}', call => ({ body: { deleted: true, conversationId: call.pathParams.conversationId } }));
    messageBff.on('get', '/conversations/{conversationId}/messages', async call => {
      if (call.pathParams.conversationId === 'conversation-5') {
        await gate;
        responded = true;
        return fallbackThread();
      }
      return swappedModel({ body: { conversation: body.conversations[2], messages: [message(21, 6, 'Troisième historique officiel')] } });
    });
    await view.act(() => view.props('Messaging').onConversationDelete(body.conversations[0]));
    try {
      await view.waitFor(() => messageBff.calls('/conversations/{conversationId}/messages').length === 1);
      if (action === 'send') {
        messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
          conversation: body.conversations[1], message: message(22, 5, 'Nouvel envoi confirmé'),
        } }));
        await view.act(() => view.props('Messaging').onSendMessage({ conversationId: 'conversation-5', content: 'Nouvel envoi confirmé', attachments: [], mentions: [] }));
      } else {
        await view.act(() => view.props('Messaging').onConversationDelete(body.conversations[1]));
        await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-21'));
      }
    } finally {
      release();
    }
    await view.waitFor(() => responded);
    assert.equal(view.props('Messaging').messages.some(item => item.id === 'message-20'), false);
    assert.equal(view.props('Messaging').activeConversationId, action === 'send' ? 'conversation-5' : 'conversation-6');
    assert.match(view.text(), action === 'send' ? /Nouvel envoi confirmé/ : /Troisième historique officiel/);
  });
}

test('a mismatched fallback refresh reports the failure without restoring the vanished thread', async () => {
  browser.setHidden(true);
  await renderFallbackPage();
  messageBff.on('get', '/conversations', { body: { conversations: [fallbackThread().body.conversation] } });
  // Default thread response is for the vanished conversation-4.
  browser.setHidden(false);
  await view.waitFor(html => html.includes('Sélectionnez-la de nouveau pour réessayer'));
  assert.equal(view.props('Messaging').activeConversationId, 'conversation-5');
  assert.deepEqual(view.props('Messaging').conversations.map(item => item.id), ['conversation-5']);
  assert.doesNotMatch(view.text(), /Bonjour à tous/);
});
