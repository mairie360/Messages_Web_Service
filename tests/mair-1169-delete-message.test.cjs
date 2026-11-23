const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-1169: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs): a tombstone is neither unread
// nor « Envoyé ».
const { unreadMessageIds, withSentStatus } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model.ts');

test('MAIR-1169 a deleted message is neither unread nor the « Envoyé » of my last message', () => {
  const thread = [
    { id: 'a', content: 'Bonjour', direction: 'outgoing' },
    { id: 'b', content: 'Salut', direction: 'incoming' },
    { id: 'c', content: '', direction: 'incoming', deleted: true },
    { id: 'd', content: '', direction: 'outgoing', deleted: true },
  ];
  assert.deepEqual(unreadMessageIds(thread, 2), ['b']);
  const shown = withSentStatus(thread);
  assert.equal(shown[0].sendStatus, 'sent');
  assert.equal(shown[3].sendStatus, undefined);
});
