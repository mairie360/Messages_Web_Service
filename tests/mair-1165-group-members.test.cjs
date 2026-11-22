const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-1165: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs): the sentence of a system note.
const { joinNames, systemNoteText } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/SystemNote/system-note-text.ts');
const { unreadMessageIds, withSentStatus } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model.ts');

const event = (action, actorId, userIds = [], userNames = [], actorName = 'Paul Martin') => ({ action, actorId, actorName, userIds, userNames });

test('MAIR-1165 a membership change is worded from the agent’s point of view', () => {
  assert.equal(systemNoteText(event('members_added', 'user-2', ['user-3'], ['Sophie Leroy']), 'user-2'), 'Vous avez ajouté Sophie Leroy au groupe.');
  assert.equal(systemNoteText(event('members_added', 'user-5', ['user-3', 'user-4', 'user-6'], ['A', 'B', 'C']), 2), 'Paul Martin a ajouté A, B et C au groupe.');
  assert.equal(systemNoteText(event('members_added', 'user-5', ['user-2'], ['Moi']), 'user-2'), 'Paul Martin vous a ajouté au groupe.');
  assert.equal(systemNoteText(event('member_removed', '2', ['user-3'], ['Sophie Leroy']), 'user-2'), 'Vous avez retiré Sophie Leroy du groupe.');
  assert.equal(systemNoteText(event('member_removed', 'user-5', ['user-2'], ['Moi']), 'user-2'), 'Paul Martin vous a retiré du groupe.');
  assert.equal(systemNoteText(event('member_removed', 'user-5', ['user-3', 'user-4'], []), 'user-2'), 'Paul Martin a retiré 2 membres du groupe.');
  assert.equal(systemNoteText({ action: 'member_left', actorId: 'user-9', userIds: [], userNames: [] }, 'user-2'), 'Un ancien membre a quitté le groupe.');
  assert.equal(systemNoteText(event('member_left', 'user-2'), 'user-2'), 'Vous avez quitté le groupe.');
  assert.equal(joinNames([]), '');
});

test('MAIR-1165 a system note is never unread nor « Envoyé »', () => {
  const messages = [
    { id: 'a', content: 'Bonjour', direction: 'outgoing' },
    { id: 'b', content: '', kind: 'system', direction: 'outgoing' },
    { id: 'c', content: '', kind: 'system', direction: 'incoming' },
  ];
  assert.deepEqual(unreadMessageIds(messages, 1), []);
  assert.equal(withSentStatus(messages)[0].sendStatus, 'sent');
  assert.equal(withSentStatus(messages)[1].sendStatus, undefined);
});
