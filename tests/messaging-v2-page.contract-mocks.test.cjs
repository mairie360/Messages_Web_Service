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

test('MAIR-1166 the composer suggestions come from the BFF and a send carries every tag of the draft', async () => {
  const group = await loaded();
  bff.on('get', '/conversations/{conversationId}/mention-suggestions', { body: { everyone: true, groups: [{ id: 'group-4', name: 'Urbanisme' }], people: [] } });
  bff.on('get', '/link-suggestions', { body: { items: [{ id: 'project-12', kind: 'project', title: 'Médiathèque', detail: 'Projet', url: 'https://projets.example/12' }], sources: { projects: 'available', calendar: 'available' } } });
  assert.equal((await messaging().onSuggestMentions(group, 'ur', new AbortController().signal)).groups[0].name, 'Urbanisme');
  assert.deepEqual(await messaging().onSuggestLinks('média', new AbortController().signal), [{ id: 'project-12', kind: 'project', title: 'Médiathèque', description: 'Projet', href: 'https://projets.example/12' }]);

  const content = 'Pour @tout le monde et @Urbanisme : #Médiathèque';
  bff.on('post', '/conversations/{conversationId}/messages', { status: 201, body: { message: message(30, 4, content), conversation: conversation(4, 'Équipe communication', { memberCount: 2 }) } });
  assert.equal(await view.act(() => messaging().onSendMessage({
    conversationId: 'conversation-4', content,
    mentions: [{ id: 'everyone', name: 'tout le monde', target: 'everyone' }, { id: 'group-4', name: 'Urbanisme', target: 'group' }],
    businessLinks: [{ id: 'project-12', title: 'Médiathèque', kind: 'project' }],
  })), true);
  assert.deepEqual(bff.calls('/conversations/{conversationId}/messages', 'post')[0].body, {
    content, attachmentIds: [], mentionIds: [], mentionEveryone: true, groupMentionIds: ['group-4'], links: [{ id: 'project-12' }],
  });
});

test('MAIR-1167 a reply is sent with the message it answers', async () => {
  await loaded();
  bff.on('post', '/conversations/{conversationId}/messages', { status: 201, body: {
    message: message(31, 4, 'Merci', users.agent, { citation: 'message-1', quoted: { id: 'message-1', authorId: `user-${users.sophie.id}`, authorName: users.sophie.name, excerpt: 'Bonjour à tous' } }),
    conversation: conversation(4, 'Équipe communication', { memberCount: 2 }),
  } });
  assert.equal(await view.act(() => messaging().onSendMessage({ conversationId: 'conversation-4', content: 'Merci', replyTo: 'message-1' })), true);
  assert.equal(bff.calls('/conversations/{conversationId}/messages', 'post')[0].body.replyTo, 'message-1');
  await view.waitFor(() => messaging().messages.some(item => item.id === 'message-31' && item.quoted?.excerpt === 'Bonjour à tous'));
});

test('MAIR-1168 an edit replaces the message in the thread, a refusal keeps it', async () => {
  await loaded();
  const mine = message(32, 4, 'Réunion à 14h');
  bff.on('post', '/conversations/{conversationId}/messages', { status: 201, body: { message: mine, conversation: conversation(4, 'Équipe communication', { memberCount: 2 }) } });
  await view.act(() => messaging().onSendMessage({ conversationId: 'conversation-4', content: 'Réunion à 14h' }));
  bff.on('patch', '/conversations/{conversationId}/messages/{messageId}', { body: { message: { ...mine, content: 'Réunion à 15h', editedAt: '2026-09-15T09:40:00.000Z' } } });
  assert.equal(await view.act(() => messaging().onEditMessage({ ...mine }, { content: 'Réunion à 15h', mentions: [], businessLinks: [] })), true);
  assert.deepEqual(bff.calls('/conversations/{conversationId}/messages/{messageId}', 'patch')[0].body, { content: 'Réunion à 15h', mentionIds: [], mentionEveryone: false, groupMentionIds: [], links: [] });
  await view.waitFor(() => messaging().messages.some(item => item.id === mine.id && item.editedAt));
  bff.on('patch', '/conversations/{conversationId}/messages/{messageId}', { status: 403, outOfContract: true, body: { error: { code: 'FORBIDDEN', message: 'Seul l’auteur peut modifier ce message.', details: [] } } });
  await assert.rejects(view.act(() => messaging().onEditMessage({ ...mine }, { content: 'Autre', mentions: [], businessLinks: [] })), /auteur/);
});

test('MAIR-1169 a deleted message becomes its tombstone and the preview of the list follows', async () => {
  await loaded();
  const mine = message(33, 4, 'Erreur de fil');
  bff.on('post', '/conversations/{conversationId}/messages', { status: 201, body: { message: mine, conversation: conversation(4, 'Équipe communication', { memberCount: 2, lastMessage: 'Erreur de fil' }) } });
  await view.act(() => messaging().onSendMessage({ conversationId: 'conversation-4', content: 'Erreur de fil' }));
  bff.on('delete', '/conversations/{conversationId}/messages/{messageId}', { body: { message: { ...mine, content: '', deleted: true } } });
  assert.equal(await view.act(() => messaging().onDeleteMessage({ ...mine })), true);
  await view.waitFor(() => messaging().messages.some(item => item.id === mine.id && item.deleted === true));
  assert.equal(messaging().conversations.find(item => item.id === 'conversation-4').lastMessage, 'Message supprimé');
  bff.on('delete', '/conversations/{conversationId}/messages/{messageId}', { status: 404, outOfContract: true, body: { error: { code: 'NOT_FOUND', message: 'Message introuvable.', details: [] } } });
  await assert.rejects(view.act(() => messaging().onDeleteMessage({ ...mine })), /introuvable|supprimé/);
});

test('MAIR-1170 my reaction is added and removed, the reactions of the BFF replace those of the message', async () => {
  await loaded();
  const target = messaging().messages.find(item => item.id === 'message-1');
  bff.on('post', '/conversations/{conversationId}/messages/{messageId}/reactions', { body: { reactions: [{ emoji: '👍', count: 1, reactedByMe: true, userNames: [users.agent.name] }] } });
  await view.act(() => messaging().onToggleReaction(target, '👍', true));
  await view.waitFor(() => messaging().messages.find(item => item.id === 'message-1').reactions?.[0]?.reactedByMe === true);
  bff.on('delete', '/conversations/{conversationId}/messages/{messageId}/reactions', { body: { reactions: [] } });
  await view.act(() => messaging().onToggleReaction(target, '👍', false));
  await view.waitFor(() => messaging().messages.find(item => item.id === 'message-1').reactions.length === 0);
  assert.equal(bff.calls('/conversations/{conversationId}/messages/{messageId}/reactions', 'delete')[0].url.searchParams.get('emoji'), '👍');
  bff.on('post', '/conversations/{conversationId}/messages/{messageId}/reactions', { status: 404, outOfContract: true, body: { error: { code: 'NOT_FOUND', message: 'Message introuvable.', details: [] } } });
  await assert.rejects(view.act(() => messaging().onToggleReaction(target, '🎉', true)), /introuvable|réaction/);
});
