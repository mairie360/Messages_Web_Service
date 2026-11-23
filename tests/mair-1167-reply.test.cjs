const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-1167: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs): the text and excerpt of the
// answered message, and the raw text kept once the author line is rendered.
const { messageExcerpt, messageText } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model.ts');
const { presentMessageAuthors } = requireSrc('lib/message-authors.tsx');

test('MAIR-1167 the reply bar quotes the text as written, cut to an excerpt', () => {
  const [presented] = presentMessageAuthors([{ id: 'message-1', content: 'Le  permis\nest signé', authorId: 'user-3', authorName: 'Sophie' }], 'user-2', [], []);
  assert.notEqual(typeof presented.content, 'string');
  assert.equal(messageText(presented), 'Le  permis\nest signé');
  assert.equal(messageExcerpt(presented), 'Le permis est signé');
  assert.equal(messageExcerpt({ id: 1, content: 'x'.repeat(150) }).length, 100);
  assert.equal(messageText({ id: 2, content: { type: 'span' } }), '');
});
