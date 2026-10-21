const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-608: the rules pulled out of the messaging components while splitting them.
const model = requireSrc('components/messaging/messaging-model.ts');
const composer = requireSrc('components/messaging/composer/composer-text.ts');
const bubble = requireSrc('components/messaging/bubble/bubble-model.ts');
const { filterMembers, toggleMemberValue } = requireSrc('components/messaging/group/group-members.ts');
const { filterConversations } = requireSrc('components/messaging/sidebar/filter-conversations.ts');

const marie = { id: 1, name: 'Marie Dubois', department: 'Finances', lastMessage: 'Budget validé' };
const pierre = { id: 'p', name: 'Pierre Martin', department: 'Urbanisme', kind: 'direct' };
const council = { id: 'g', name: 'Conseil', kind: 'group', department: 'Élus' };

test('MAIR-608 ids match across numbers and strings, never on undefined', () => {
  assert.equal(model.messagingIdsMatch(1, '1'), true);
  assert.equal(model.messagingIdsMatch(undefined, undefined), false);
  assert.equal(model.messagingIdsMatch('a', 'b'), false);
});

test('MAIR-608 the author decides the bubble side once the current user is known', () => {
  assert.equal(model.getMessageDirection({ id: 1, authorId: 7, direction: 'incoming' }, '7'), 'outgoing');
  assert.equal(model.getMessageDirection({ id: 1, authorId: 8 }, 7), 'incoming');
  assert.equal(model.getMessageDirection({ id: 1, direction: 'outgoing' }), 'outgoing');
  assert.equal(model.getMessageDirection({ id: 1 }), 'incoming');
});

test('MAIR-608 streamed messages are appended once', () => {
  const merged = model.mergeMessagesById([{ id: 1 }, { id: 2 }], [{ id: '2' }, { id: 3 }, { id: 3 }]);
  assert.deepEqual(merged.map(message => message.id), [1, 2, 3]);
  assert.deepEqual(model.mergeMessagesById([{ id: 1 }]).map(message => message.id), [1]);
});

test('MAIR-608 mention options list contacts then groups, each once', () => {
  const options = model.buildMentionOptions([marie, marie], [pierre, council]);
  assert.deepEqual(options.map(option => `${option.kind}:${option.name}:${option.description}`), [
    'direct:Marie Dubois:Finances', 'group:Conseil:Élus',
  ]);
});

test('MAIR-608 a dialog closes on a confirmed submit only', async () => {
  let closed = 0; const close = () => { closed += 1; };
  assert.equal(model.closeWhenConfirmed(false, close), false); assert.equal(closed, 0);
  model.closeWhenConfirmed(undefined, close); assert.equal(closed, 1);
  assert.equal(await model.closeWhenConfirmed(Promise.resolve(false), close), false); assert.equal(closed, 1);
  assert.equal(await model.closeWhenConfirmed(Promise.resolve(true), close), true); assert.equal(closed, 2);
});

test('MAIR-608 the send payload only carries present optional parts', () => {
  assert.deepEqual(model.buildSendPayload(1, 'Bonjour'), { conversationId: 1, content: 'Bonjour' });
  assert.deepEqual(model.buildSendPayload(1, 'Bonjour', { attachments: [], mentions: [] }), { conversationId: 1, content: 'Bonjour' });
  const context = { id: 't', kind: 'task', title: 'Devis' };
  assert.deepEqual(Object.keys(model.buildSendPayload(1, 'x', { attachments: [{ id: 'a', name: 'f' }], mentions: [{ id: 2, name: 'M' }], businessLinks: [context], context })),
    ['conversationId', 'content', 'attachments', 'mentions', 'businessLinks', 'context']);
});

test('MAIR-608 composer triggers match the token being typed at the end of the draft', () => {
  assert.deepEqual(composer.getTriggerMatch('Bonjour @Mar', '@'), { start: 8, query: 'Mar' });
  assert.equal(composer.getTriggerMatch('mail@exemple', '@'), null);
  assert.deepEqual(composer.getBusinessReferenceMatch('Voir #Conseil mun'), { start: 5, query: 'Conseil mun' });
  assert.equal(composer.getBusinessReferenceMatch('Pas de dièse'), null);
  assert.equal(composer.appendTrigger('', '@'), '@');
  assert.equal(composer.appendTrigger('Salut', '#'), 'Salut #');
  assert.equal(composer.appendTrigger('Salut ', '#'), 'Salut #');
  assert.equal(composer.insertToken('Bonjour @Ma', { start: 8, query: 'Ma' }, '@Marie Dubois'), 'Bonjour @Marie Dubois ');
});

test('MAIR-608 composer suggestions ignore accents and case, mentions are capped at six', () => {
  const people = Array.from({ length: 8 }, (_, index) => ({ id: index, name: `Élodie ${index}` }));
  assert.equal(composer.mentionSuggestionsFor(people, { start: 0, query: 'elo' }).length, 6);
  assert.deepEqual(composer.mentionSuggestionsFor(people, null), []);
  const references = [{ id: 1, title: 'Réunion', kind: 'event' }, { id: 2, title: 'Budget', kind: 'project' }];
  assert.deepEqual(composer.businessReferenceSuggestionsFor(references, { start: 0, query: 'REU' }).map(item => item.id), [1]);
  assert.deepEqual(composer.businessReferenceSuggestionsFor(references, null), []);
  assert.equal(composer.normalizeMentionValue('ÉCOLE'), 'ecole');
  assert.deepEqual(composer.addOnce([{ id: 1 }], { id: 1 }), [{ id: 1 }]);
  assert.deepEqual(composer.addOnce([{ id: 1 }], { id: 2 }), [{ id: 1 }, { id: 2 }]);
});

test('MAIR-608 revoking a draft URL never throws', () => {
  const original = URL.revokeObjectURL;
  try {
    URL.revokeObjectURL = () => { throw new Error('revoked twice'); };
    assert.doesNotThrow(() => composer.revokeDraftUrl('blob:x'));
  } finally { URL.revokeObjectURL = original; }
});

test('MAIR-608 bubble references keep the context first and each id once', () => {
  const context = { id: 'p', kind: 'project', title: 'École' };
  const references = bubble.uniqueBusinessReferences({ id: 1, context, businessLinks: [context, { id: 't', kind: 'task', title: 'Devis' }] });
  assert.deepEqual(references.map(reference => reference.id), ['p', 't']);
  assert.deepEqual(bubble.uniqueBusinessReferences({ id: 1 }), []);
});

test('MAIR-608 mention highlighting only keeps labels present in the content, longest first', () => {
  const kinds = bubble.mentionKindsIn('@Marie Dubois voit #Budget', [{ id: 1, name: 'Marie' }, { id: 2, name: 'Marie Dubois' }, { id: 3, name: ' ' }], [{ id: 'b', title: 'Budget', kind: 'project' }, { id: 'c', title: 'Absent', kind: 'task' }]);
  assert.deepEqual([...kinds], [['@Marie', 'user'], ['@Marie Dubois', 'user'], ['#Budget', 'business']]);
  assert.deepEqual(bubble.splitOnMentions('@Marie Dubois et @Mariette', ['@Marie', '@Marie Dubois']), ['', '@Marie Dubois', ' et @Mariette']);
  assert.equal(bubble.escapeRegExp('a.b*c'), 'a\\.b\\*c');
});

test('MAIR-608 group members are searched without accents and toggled by string id', () => {
  assert.deepEqual(filterMembers([marie, pierre], ' finances ').map(member => member.id), [1]);
  assert.deepEqual(filterMembers([marie, { id: 3, name: 'Sans service' }], 'service').map(member => member.id), [3]);
  assert.equal(filterMembers([marie, pierre], '').length, 2);
  assert.deepEqual(toggleMemberValue(['1'], 1), []);
  assert.deepEqual(toggleMemberValue(['1'], 'p'), ['1', 'p']);
});

test('MAIR-608 the sidebar search also matches the department and the last message', () => {
  assert.deepEqual(filterConversations([marie, pierre], 'VALIDE').map(item => item.id), [1]);
  assert.deepEqual(filterConversations([marie, pierre], 'urba').map(item => item.id), ['p']);
  assert.deepEqual(filterConversations([{ id: 4, name: 'Seul' }], '').map(item => item.id), [4]);
});
