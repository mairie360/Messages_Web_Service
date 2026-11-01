const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { contact, conversation, message, messageBffContract, users } = require('./support/fixtures.cjs');
const { requireSrc } = require('./support/load-ts.cjs');

// Mise à jour de l'état de la page à partir de DTO conformes au contrat BFF_Message (les fixtures sont
// d'abord validées contre les schémas des réponses qui les portent).

const {
  appendMessage, findDirectConversation, getPayloadIds, idsMatch, isPlaceholderConversationName, isUserId, replaceConversationMessages,
  toMentionIds, toMessagingContacts, toMessagingUserId, upsertConversation,
} = requireSrc('lib/messaging-state.ts');

const contract = messageBffContract();
const validResponse = (method, pathname, status, body) => {
  const { schema } = contract.responseSchema(contract.match(method, pathname), status);
  assert.deepEqual(contract.validate(schema, body), []);
  return body;
};

describe('messaging state helpers', () => {
  // MAIR-204: direct conversations carry `kind: 'direct'` and the contact's `contactId`.
  test('finds the existing direct conversation with a recipient', () => {
    const direct = { id: 'conversation-9', name: 'Sophie Leroy', kind: 'direct', contactId: 'user-7' };
    const group = { id: 'conversation-3', name: 'Voirie', kind: 'group' };
    const directWithoutContact = { id: 'conversation-4', name: 'Direct', kind: 'direct' };
    const conversations = [group, directWithoutContact, direct];

    assert.equal(findDirectConversation(conversations, 'user-7'), direct);
    assert.equal(findDirectConversation(conversations, 7), direct);
    assert.equal(findDirectConversation(conversations, 'user-8'), undefined);
    assert.equal(findDirectConversation([{ ...group, contactId: 'user-7' }], 'user-7'), undefined);
    assert.equal(findDirectConversation([], 'user-7'), undefined);
  });

  test('ids match across string and number representations', () => {
    assert.equal(idsMatch(4, '4'), true);
    assert.equal(idsMatch('conversation-4', 'conversation-5'), false);
    assert.equal(idsMatch(undefined, ''), true);
    assert.equal(toMessagingUserId(2), 'user-2');
    assert.equal(toMessagingUserId('user-2'), 'user-2');
    assert.equal(toMessagingUserId(undefined), undefined);
    assert.deepEqual(getPayloadIds([{ id: 1 }, { id: 'a' }]), [1, 'a']);
    assert.equal(getPayloadIds(undefined), undefined);
  });

  test('contacts from GET /contacts become direct conversations', () => {
    const { contacts } = validResponse('GET', '/contacts', 200, { contacts: [contact(users.sophie, { avatarUrl: 'https://cdn.mairie360.fr/sophie.png' })] });
    assert.deepEqual(toMessagingContacts(contacts), [{
      id: 'user-7', name: 'Sophie Leroy', department: 'Voirie', kind: 'direct', avatarUrl: 'https://cdn.mairie360.fr/sophie.png', initials: 'SL', presence: 'online',
    }]);
    assert.deepEqual(toMessagingContacts(undefined), []);
  });

  test('a conversation returned by the BFF is added first or merged without losing a real name', () => {
    const existing = [conversation(4, 'Équipe communication', { unreadCount: 3 }), conversation(5, 'Sophie Leroy')];
    const { conversation: placeholder } = validResponse('POST', '/conversations/4/messages', 201, {
      message: message(9, 4, 'Nouveau'), conversation: conversation(4, 'Conversation 4', { unreadCount: 0 }),
    });

    const merged = upsertConversation(existing, placeholder);
    assert.deepEqual(merged[0], { ...existing[0], ...placeholder, name: 'Équipe communication' });

    const renamed = upsertConversation(existing, conversation(5, 'Sophie L.'));
    assert.equal(renamed[1].name, 'Sophie L.');

    const created = upsertConversation(existing, conversation(7, 'Commission voirie'));
    assert.deepEqual(created.map((item) => item.id), ['conversation-7', 'conversation-4', 'conversation-5']);
    assert.equal(upsertConversation(existing, undefined), existing);
    assert.equal(isPlaceholderConversationName(' conversation 12 '), true);
  });

  test('messages of a conversation are replaced and a sent message is appended once', () => {
    const current = [message(1, 4, 'A'), message(2, 5, 'B')];
    const { messages } = validResponse('GET', '/conversations/4/messages', 200, { conversation: conversation(4, 'Équipe'), messages: [message(3, 4, 'C')] });

    const replaced = replaceConversationMessages(current, 'conversation-4', messages);
    assert.deepEqual(replaced.map((item) => item.id), ['message-2', 'message-3']);

    const appended = appendMessage(replaced, message(4, 4, 'D'));
    assert.deepEqual(appended.map((item) => item.id), ['message-2', 'message-3', 'message-4']);
    const updated = appendMessage(appended, message(4, 4, 'D modifié'));
    assert.deepEqual([updated.length, updated[2].content], [3, 'D modifié']);
    assert.equal(appendMessage(current, undefined), current);
  });
});

describe('mention ids sent to the BFF (MAIR-512)', () => {
  test('isUserId follows the BFF rule: a positive integer or user-<n>', () => {
    for (const id of ['user-3', 'user-12', 3, '7']) assert.equal(isUserId(id), true, String(id));
    for (const id of ['conversation-4', 'user-0', 0, -1, 'user-', 'user-3 AND 1=2', '3.5', '']) assert.equal(isUserId(id), false, String(id));
  });

  test('toMentionIds keeps the users and drops group conversations and unknown ids', () => {
    assert.deepEqual(toMentionIds([{ id: 'user-7' }, { id: 'conversation-4' }, { id: 12 }, { id: 'user-x' }]), ['user-7', 12]);
    assert.deepEqual(toMentionIds([]), []);
    assert.deepEqual(toMentionIds(undefined), []);
  });
});
