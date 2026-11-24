const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1166: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs): the tag suggestions of the
// composer, the tags sent to the BFF and the links rendered in the bubbles.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const tags = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions.ts');
const { toLinkReference, toTagPayload } = requireSrc('lib/messaging-state.ts');
const { presentMessageAuthors } = requireSrc('lib/message-authors.tsx');

let view;
afterEach(() => { view?.unmount(); view = undefined; });

test('MAIR-1166 the tag being typed ends the text: `@` stops at a space, `#` titles may hold one', () => {
  assert.deepEqual(tags.tagMatchAt('Bonjour @So'), { trigger: '@', start: 8, query: 'So' });
  assert.deepEqual(tags.tagMatchAt('Voir #Conseil mun'), { trigger: '#', start: 5, query: 'Conseil mun' });
  assert.equal(tags.tagMatchAt('Bonjour @Sophie Leroy merci'), null, 'a chosen tag is frozen');
  assert.equal(tags.tagMatchAt('mail@exemple'), null);
  assert.equal(tags.insertTag('Bonjour @So', { trigger: '@', start: 8, query: 'So' }, 'Sophie Leroy'), 'Bonjour @Sophie Leroy ');
  const options = tags.mentionOptions({ everyone: true, groups: [{ id: 'group-4', name: 'Urbanisme' }], people: [{ id: 'user-3', name: 'Sophie' }] });
  assert.deepEqual(options.map(option => [option.section, tags.tagLabel(option), option.mention.target]), [
    ['Tout le monde', tags.EVERYONE_LABEL, 'everyone'], ['Groupes et services', 'Urbanisme', 'group'], ['Personnes', 'Sophie', 'person'],
  ]);
  assert.deepEqual(tags.mentionOptions({ everyone: false, groups: [], people: [] }), []);
  const local = tags.localOptions({ trigger: '#', start: 0, query: 'medi' }, [], [{ id: 'p', title: 'Médiathèque', kind: 'project' }]);
  assert.equal(tags.tagLabel(local[0]), 'Médiathèque');
  assert.deepEqual(tags.localOptions({ trigger: '@', start: 0, query: 'con' }, [{ id: 'g', name: 'Conseil', kind: 'group' }], []).map(option => option.section), ['Groupes et services']);
});

test('MAIR-1166 the suggestions are asked once the agent stops typing, moved with the arrows and dismissed with Échap', async () => {
  const asked = [];
  const sources = {
    mentions: async query => { asked.push(`@${query}`); return { everyone: true, groups: [], people: [{ id: 'user-3', name: 'Sophie' }] }; },
    links: async query => { asked.push(`#${query}`); if (query === 'x') throw new Error('down'); return [{ id: 'event-5', title: 'Conseil', kind: 'event' }]; },
  };
  let state; let setValue;
  const Probe = () => {
    const [value, update] = React.useState('');
    setValue = update;
    state = tags.useTagSuggestions(value, { mentions: [], references: [] }, sources);
    return React.createElement('p', null, String(state.open));
  };
  view = mount(React.createElement(Probe));
  assert.equal(state.open, false);
  await view.act(() => setValue('@S'));
  await view.act(() => setValue('@So'));
  await view.waitFor(() => state.open);
  assert.deepEqual(asked, ['@So'], 'debounced');
  assert.equal(state.activeIndex, 0);
  await view.act(() => state.move(1));
  assert.equal(state.activeOption.mention.name, 'Sophie');
  await view.act(() => state.move(1));
  assert.equal(state.activeIndex, 0, 'the arrows wrap around');
  await view.act(() => state.dismiss());
  assert.equal(state.open, false);
  await view.act(() => setValue('#con'));
  await view.waitFor(() => state.open && state.options[0].reference.id === 'event-5');
  await view.act(() => setValue('#x'));
  await view.waitFor(() => asked.includes('#x'));
  await view.settle();
  assert.equal(state.open, false, 'a failed suggestion request shows no list');
});

test('MAIR-1166 the tags of a draft are sent as the BFF takes them', () => {
  assert.deepEqual(toTagPayload(
    [{ id: 'user-3', target: 'person' }, { id: 'everyone', target: 'everyone' }, { id: 'group-4', target: 'group' }, { id: 'conversation-9', kind: 'group' }],
    [{ id: 'project-12' }, { id: 'project:42' }],
  ), { mentionIds: ['user-3'], mentionEveryone: true, groupMentionIds: ['group-4'], links: [{ id: 'project-12' }] });
  assert.deepEqual(toTagPayload(), { mentionIds: [] });
  assert.deepEqual(toLinkReference({ id: 'task-4', kind: 'task', title: 'Devis', detail: 'Tâche', url: 'https://p/t/4' }), { id: 'task-4', kind: 'task', title: 'Devis', description: 'Tâche', href: 'https://p/t/4' });
  assert.deepEqual(toLinkReference({ id: 'event-5', kind: 'event', title: 'Conseil' }), { id: 'event-5', kind: 'event', title: 'Conseil' });
});

test('MAIR-1166 a linked element is a link to its page, everyone and groups are emphasised', () => {
  const [message] = presentMessageAuthors([{
    id: 'message-1', conversationId: 'conversation-4', authorId: 'user-3', authorName: 'Sophie Leroy',
    content: 'Pour @tout le monde et @Urbanisme : voir #Médiathèque',
    mentionsEveryone: true, groupMentions: [{ id: 'group-4', name: 'Urbanisme' }],
    links: [{ id: 'project-12', kind: 'project', title: 'Médiathèque', url: 'https://projets.mairie360.fr/projects/12' }],
  }], 'user-2', [], []);
  const html = renderToStaticMarkup(React.createElement('div', null, message.content));
  assert.match(html, /<a[^>]*href="https:\/\/projets\.mairie360\.fr\/projects\/12"[^>]*>#Médiathèque<\/a>/);
  assert.match(html, /<strong[^>]*data-mention-kind="user"[^>]*>@tout le monde<\/strong>/);
  assert.match(html, /<strong[^>]*data-mention-kind="user"[^>]*>@Urbanisme<\/strong>/);
  // Only a person tag opens a card; everyone and a group are not buttons and not underlined like a link.
  assert.doesNotMatch(html, /<button|data-mention-person|<strong[^>]*underline/);
});
