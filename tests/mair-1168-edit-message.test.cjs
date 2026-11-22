const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-1168: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs): the tags an edited message
// keeps and the tags sent with the edit.
const { messageTags, tagsIn } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble/components/MessageEditBox/edit-tags.ts');
const { appendTagTrigger } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions.ts');
const { toEditTagPayload } = requireSrc('lib/messaging-state.ts');

test('MAIR-1168 the tags of a message stay tags while its text is edited', () => {
  const tags = messageTags({
    id: 'message-1', content: '', mentionsEveryone: true,
    mentions: [{ id: 'user-3', name: 'Sophie' }],
    groupMentions: [{ id: 'group-4', name: 'Urbanisme' }, { id: 'group-5' }],
    links: [{ id: 'project-12', kind: 'project', title: 'Médiathèque', url: 'https://p/12' }, { id: 'task-3', kind: 'task' }],
  });
  assert.deepEqual(tags.mentions.map(mention => [mention.id, mention.target]), [['everyone', 'everyone'], ['group-4', 'group'], ['user-3', 'person']]);
  assert.deepEqual(tags.references, [{ id: 'project-12', kind: 'project', title: 'Médiathèque', href: 'https://p/12' }]);
  const kept = tagsIn('Pour @tout le monde : #Médiathèque', tags);
  assert.deepEqual(kept.mentions.map(mention => mention.id), ['everyone']);
  assert.deepEqual(kept.businessLinks.map(link => link.id), ['project-12']);
  assert.deepEqual(messageTags({ id: 'message-2', content: '' }), { mentions: [], references: [] });
});

test('MAIR-1168 an edit sends every tag field, so that a removed tag is removed', () => {
  assert.deepEqual(toEditTagPayload(), { mentionIds: [], mentionEveryone: false, groupMentionIds: [], links: [] });
  assert.deepEqual(toEditTagPayload([{ id: 'everyone', target: 'everyone' }, { id: 'group-4', target: 'group' }], [{ id: 'event-5' }]),
    { mentionIds: [], mentionEveryone: true, groupMentionIds: ['group-4'], links: [{ id: 'event-5' }] });
  assert.equal(appendTagTrigger('Bonjour', '@'), 'Bonjour @');
  assert.equal(appendTagTrigger('Bonjour ', '#'), 'Bonjour #');
  assert.equal(appendTagTrigger('', '@'), '@');
});
