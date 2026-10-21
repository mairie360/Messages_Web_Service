const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-608: node owns the coverage of every TSX file, so the sub-components that the
// page journeys do not reach are rendered here directly (jsdom tests: tests/component/messaging/units).
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { MentionedContent } = requireSrc('components/messaging/bubble/MentionedContent.tsx');
const { ComposerAttachmentChips } = requireSrc('components/messaging/composer/ComposerAttachmentChips.tsx');
const { GroupDetailsFields } = requireSrc('components/messaging/group/GroupDetailsFields.tsx');
const { GroupMemberPicker } = requireSrc('components/messaging/group/GroupMemberPicker.tsx');
const { ContextReferenceBar } = requireSrc('components/messaging/thread/ContextReferenceBar.tsx');

let view;
afterEach(() => {
  view?.unmount();
  view = undefined;
});
const h = React.createElement;
const members = [{ id: 'm', name: 'Marie Dubois', department: 'Finances' }, { id: 's', name: 'Sans service' }];

test('MAIR-608 mentioned content emphasises known mentions and references', () => {
  view = mount(h(MentionedContent, { content: 'Voir @Marie Dubois et #Budget', mentions: [{ id: 1, name: 'Marie Dubois' }], businessReferences: [{ id: 'b', title: 'Budget', kind: 'project' }] }));
  assert.match(view.html, /<strong[^>]*data-mention-kind="user"[^>]*>@Marie Dubois<\/strong>/);
  assert.match(view.html, /<strong[^>]*data-mention-kind="business"[^>]*>#Budget<\/strong>/);
  view.unmount();
  view = mount(h(MentionedContent, { content: 'Rien à souligner', mentions: [], businessReferences: [] }));
  assert.doesNotMatch(view.html, /<strong/);
});

test('MAIR-608 draft attachment chips are removable', async () => {
  const removed = [];
  view = mount(h(ComposerAttachmentChips, { attachments: [{ id: 'a1', name: 'plan.pdf' }], disabled: false, onRemove: (id) => removed.push(id) }));
  await view.click((props) => props['aria-label'] === 'Retirer plan.pdf');
  assert.deepEqual(removed, ['a1']);
  view.unmount();
  view = mount(h(ComposerAttachmentChips, { attachments: [], disabled: false, onRemove() {} }));
  assert.equal(view.html, '');
});

test('MAIR-608 group details and member picker report their edits', async () => {
  const edits = [];
  view = mount(h(GroupDetailsFields, {
    nameLabel: 'Nom du groupe', namePlaceholder: 'Nom', descriptionLabel: 'Description (optionnel)', descriptionPlaceholder: 'Description',
    name: '', description: '', disabled: false,
    onNameChange: (value) => edits.push(['name', value]), onDescriptionChange: (value) => edits.push(['description', value]),
  }));
  await view.fire((props, _text, tag) => tag === 'input' && props.name === 'groupName', 'onChange', { target: { value: 'Conseil' } });
  await view.fire((props, _text, tag) => tag === 'input' && props.name === 'groupDescription', 'onChange', { target: { value: 'Élus' } });
  assert.deepEqual(edits, [['name', 'Conseil'], ['description', 'Élus']]);
  view.unmount();

  const toggled = []; const searches = [];
  view = mount(h(GroupMemberPicker, { label: 'Membres', members, selectedValues: ['s'], search: '', disabled: false,
    onToggle: (id) => toggled.push(id), onSearchChange: (value) => searches.push(value) }));
  assert.match(view.text(), /Marie Dubois - Finances/);
  assert.match(view.text(), /Sans service/);
  await view.fire((props, _text, tag) => tag === 'input' && props.type === 'checkbox' && props.checked === false, 'onChange', { target: { checked: true } });
  await view.fire((props, _text, tag) => tag === 'input' && props.name === 'memberSearch', 'onChange', { target: { value: 'fin' } });
  assert.deepEqual(toggled, ['m']);
  assert.deepEqual(searches, ['fin']);
  view.unmount();
  view = mount(h(GroupMemberPicker, { label: 'Membres', members, selectedValues: [], search: 'inconnu', disabled: true, onToggle() {}, onSearchChange() {} }));
  assert.match(view.text(), /Aucun contact trouvé\./);
});

test('MAIR-608 the context bar labels each kind and opens the reference', async () => {
  const opened = [];
  for (const [kind, label] of [['event', 'Événement'], ['task', 'Tâche'], ['project', 'Projet']]) {
    const reference = { id: kind, kind, title: `Élément ${kind}` };
    view = mount(h(ContextReferenceBar, { reference, onOpen: (item) => opened.push(item.id) }));
    assert.match(view.text(), new RegExp(`${label} : Élément ${kind}`));
    await view.click('Ouvrir');
    view.unmount();
  }
  view = mount(h(ContextReferenceBar, { reference: { id: 'x', kind: 'task', title: 'Lecture seule' } }));
  assert.doesNotMatch(view.text(), /Ouvrir/);
  assert.deepEqual(opened, ['event', 'task', 'project']);
});
