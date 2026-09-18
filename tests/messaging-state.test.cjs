const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { contact, conversation, message, messageBffContract, users } = require('./support/fixtures.cjs');
const { requireSrc } = require('./support/load-ts.cjs');

// Mise à jour de l'état de la page à partir de DTO conformes au contrat BFF_Message (les fixtures sont
// d'abord validées contre les schémas des réponses qui les portent).

const {
  appendMessage, getPayloadIds, idsMatch, isPlaceholderConversationName, replaceConversationMessages,
  toMessagingContacts, toMessagingUserId, upsertConversation,
} = requireSrc('lib/messaging-state.ts');

const contract = messageBffContract();
const validResponse = (method, pathname, status, body) => {
  const { schema } = contract.responseSchema(contract.match(method, pathname), status);
  assert.deepEqual(contract.validate(schema, body), []);
  return body;
};

describe('messaging state helpers', () => {
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
