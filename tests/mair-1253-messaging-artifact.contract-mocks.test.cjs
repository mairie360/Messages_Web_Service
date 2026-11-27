const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// Business journey of the messaging screen as its artifact draws it, on the real page rendered against the
// contract-driven BFF_Message mock: open a conversation, read its thread (day separators, authors), send a message
// from the composer, then find it in the conversation list. There is no newman collection in this repository, so
// this rendered-page test is the integration check of the journey.

const { router } = installReactRuntime();
const React = require('react');
const { installBrowser } = require('./support/browser.cjs');
const { bootstrap, contact, conversation, message, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const Page = requireSrc('components/MessagesPage/MessagesPage.tsx').default;
const { formatMessageTime } = requireSrc('lib/message-timestamps.ts');

const messageBff = messageBffMock();
const userBff = new ContractMockServer('BFF_USER', OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json')));
const network = new FrontNetwork([messageBff, userBff]);
const browser = installBrowser();
let view;

// Same known defect of the published contract as messages-page.contract-mocks.test.cjs: orval swapped the request
// and response models of /conversations/{conversationId}/messages.
const KNOWN_CONTRACT_DEFECTS = [
  /^\[BFF_MESSAGE\] requête POST \/conversations\/\{conversationId\}\/messages \$body\.message: propriété requise manquante$/,
];
const swappedModel = (reply) => ({ ...reply, outOfContract: true });

const now = Date.now();
const today = new Date(now - 60_000).toISOString();
const yesterday = new Date(now - 86_400_000).toISOString();
const sophie = conversation(5, 'Sophie Leroy', { kind: 'direct', department: 'Urbanisme', presence: 'online', contactId: 'user-7',
  lastMessage: 'Le dossier est prêt', lastMessageAt: today, memberCount: 2 });
const group = conversation(4, 'Équipe communication', { memberCount: 4, lastMessage: 'Bonjour à tous', lastMessageAt: yesterday });
const sophieThread = [
  message(11, 5, 'Bonjour, voici le permis.', users.sophie, { sentAt: yesterday }),
  message(12, 5, 'Le dossier est prêt', users.sophie, { sentAt: today }),
];

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
  const body = bootstrap();
  body.conversations = [group, sophie];
  body.contacts = [contact(users.sophie, { department: 'Urbanisme' }), contact(users.thomas)];
  body.messages = [message(1, 4, 'Bonjour à tous', users.sophie, { sentAt: yesterday })];
  messageBff.on('get', '/messaging/bootstrap', { body });
  messageBff.on('get', '/me', { body: { currentUser: body.currentUser } });
  messageBff.on('get', '/contacts', { body: { contacts: body.contacts } });
  messageBff.on('get', '/business-references', { body: { references: [], sources: { projects: 'available', calendar: 'available' } } });
  messageBff.on('get', '/conversations', { body: { conversations: [group, sophie] } });
  messageBff.on('get', '/conversations/{conversationId}/messages', swappedModel({ body: { conversation: sophie, messages: sophieThread } }));
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  assert.deepEqual([...messageBff.violations.filter((line) => !KNOWN_CONTRACT_DEFECTS.some((known) => known.test(line))), ...userBff.violations, ...network.violations], []);
});

const composer = () => view.hostElements(props => String(props.placeholder).startsWith('Écrire un message') && !props.disabled)[0];

async function openPage() {
  view = mount(React.createElement(Page));
  await view.waitFor(() => view.find('Messaging').length > 0 && view.props('Messaging').emptyStateLabel === undefined);
}

test('MAIR-1253 business journey: open a conversation, read the thread, send a message and find it in the list', async () => {
  await openPage();

  // The header names the agent of the bootstrap with their role.
  assert.equal(view.props('Header').user.name, 'Agent Mairie');
  assert.equal(view.props('Header').user.role, 'Responsable');

  // The open group shows the avatars of the people who wrote in it and its number of members.
  assert.match(view.text(), /SL 4 Gérer les membres/);

  // The list: full names, the service of a person, « Groupe · N membres » for a group, the last message.
  assert.match(view.text(), /Équipe communication Groupe · 4 membres Bonjour à tous Hier/);
  assert.match(view.text(), new RegExp(`Sophie Leroy Urbanisme Le dossier est prêt ${formatMessageTime(today)}`));

  // Open the direct conversation with Sophie Leroy.
  await view.act(() => view.props('Messaging').onConversationSelect(view.props('Messaging').conversations.find(item => item.id === 'conversation-5')));
  await view.waitFor(() => view.props('Messaging').activeConversationId === 'conversation-5' && /Bonjour, voici le permis/.test(view.text()));

  // The thread: « Hier » then « Aujourd’hui », each before its messages, the author written before the time.
  const html = view.html;
  const separators = [...html.matchAll(/data-day-separator=""[^>]*>(?:<[^>]+>)*([^<]+)</g)].map(match => ({ label: match[1], at: match.index }));
  assert.deepEqual(separators.map(separator => separator.label), ['Hier', 'Aujourd’hui']);
  assert.ok(separators[0].at < html.indexOf('Bonjour, voici le permis'));
  assert.ok(html.indexOf('Bonjour, voici le permis') < separators[1].at);
  assert.ok(separators[1].at < html.lastIndexOf('Le dossier est prêt'));
  assert.match(html, /data-message-author="user-7"[^>]*>Sophie Leroy<\/span>/);
  assert.match(view.text(), new RegExp(`Sophie Leroy ${formatMessageTime(today)}`));

  // The composer writes to Sophie Leroy and sends with « Envoyer ».
  assert.equal(composer().props.placeholder, 'Écrire un message à Sophie Leroy… (@ pour mentionner, # pour lier un élément)');
  assert.ok(view.hostElements((props, text, tag) => tag === 'button' && props.type === 'submit' && text === 'Envoyer').length > 0);

  const content = 'Merci, je le transmets au maire.';
  const sentAt = new Date().toISOString();
  messageBff.on('post', '/conversations/{conversationId}/messages', swappedModel({ status: 201, body: {
    message: message(13, 5, content, users.agent, { sentAt }),
    conversation: { ...sophie, lastMessage: content, lastMessageAt: sentAt },
  } }));
  await view.fire(props => props === composer().props, 'onChange', { target: { value: content } });
  await view.fire((props, _text, tag) => tag === 'form' && props.role !== 'search' && !props.hidden, 'onSubmit', { preventDefault() {} });
  await view.waitFor(() => view.props('Messaging').messages.some(item => item.id === 'message-13'));

  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'POST').length, 1);
  assert.equal(messageBff.calls('/conversations/{conversationId}/messages', 'POST')[0].body.content, content);
  // My message shows its time only, without an author line.
  assert.doesNotMatch(view.text(), /Agent Mairie \(vous\)/);
  // Back in the list: the conversation shows the message just sent and its time of today.
  await view.waitFor(() => view.props('Messaging').conversations.find(item => item.id === 'conversation-5')?.lastMessage === content);
  assert.match(view.text(), new RegExp(`Sophie Leroy Urbanisme Merci, je le transmets au maire\\. ${formatMessageTime(sentAt)}`));
  const listed = view.props('Messaging').conversations.find(item => item.id === 'conversation-5');
  assert.equal(listed.lastMessage, content);
  assert.equal(listed.lastMessageAt, formatMessageTime(sentAt));
});
