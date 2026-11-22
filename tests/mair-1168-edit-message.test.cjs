const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { MessageEditBox } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble/components/MessageEditBox/MessageEditBox.tsx');
let view;
afterEach(() => { view?.unmount(); view = undefined; });

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

test('MAIR-1168 the edit box saves the changed text with its tags, keeps it on a refusal and cancels', async () => {
  const saves = [];
  let refuse = true;
  let cancelled = 0;
  const message = { id: 'message-1', content: 'Voir @Sophie', mentions: [{ id: 'user-3', name: 'Sophie' }] };
  view = mount(React.createElement(MessageEditBox, {
    message, initialText: 'Voir @Sophie',
    mentionOptions: [{ id: 'user-4', name: 'Paul Martin' }],
    onSave: async payload => { saves.push(payload); if (refuse) { refuse = false; throw new Error('Refusé par le BFF.'); } return true; },
    onCancel: () => { cancelled += 1; },
  }));
  const field = props => props['aria-autocomplete'] === 'list';
  assert.match(view.text(), /Échap pour annuler · Entrée pour enregistrer/);
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  assert.equal(saves.length, 0, 'an unchanged text is not saved');
  await view.fire(field, 'onChange', { target: { value: 'Voir @Sophie demain' } });
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  await view.waitFor(() => view.text().includes('Refusé par le BFF.'));
  assert.equal(saves[0].content, 'Voir @Sophie demain');
  assert.deepEqual(saves[0].mentions.map(mention => mention.id), ['user-3']);
  await view.click(props => props['aria-label'] === 'Mentionner une personne');
  await view.fire(field, 'onChange', { target: { value: 'Voir @Sophie demain @Pa' } });
  await view.waitFor(() => view.text().includes('@Paul Martin'));
  await view.fire(field, 'onKeyDown', { key: 'ArrowDown' });
  await view.fire(field, 'onKeyDown', { key: 'Enter' });
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  await view.waitFor(() => saves.length === 2);
  assert.deepEqual(saves[1].mentions.map(mention => mention.id), ['user-3', 'user-4']);
  await view.fire(field, 'onKeyDown', { key: 'Escape' });
  await view.click('Annuler');
  assert.equal(cancelled, 2);
});
