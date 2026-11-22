const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1165: node owns the coverage of every TSX file; « Ajouter des membres » is only reached through the lib Drawer
// of the members panel in the jsdom tests, so the view is rendered here directly.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { AddMembersView } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/GroupMembersPanel/components/AddMembersView/AddMembersView.tsx');

let view;
afterEach(() => { view?.unmount(); view = undefined; });
const h = React.createElement;
const candidates = [
  { id: 'user-7', name: 'Sophie Leroy', department: 'Voirie' },
  { id: 'user-9', name: 'Thomas Bernard' },
];

function Harness({ initial = [], onSubmit, onCancel, pending = false }) {
  const [selectedIds, setSelectedIds] = React.useState(initial);
  return h(AddMembersView, { candidates, selectedIds, onSelectedIdsChange: setSelectedIds, pending, onCancel: onCancel ?? (() => {}), onSubmit: () => onSubmit?.(selectedIds) });
}

test('MAIR-1165 ticking agents counts them on « Ajouter », unticking removes them, then the selection is submitted', async () => {
  const submitted = [];
  view = mount(h(Harness, { onSubmit: ids => submitted.push(ids) }));
  assert.match(view.text(), /Sophie Leroy · Voirie/);
  assert.match(view.text(), /Thomas Bernard/);
  const unchecked = (props, _text, tag) => tag === 'input' && props.type === 'checkbox' && props.checked === false;
  const checked = (props, _text, tag) => tag === 'input' && props.type === 'checkbox' && props.checked === true;
  await view.fire(unchecked, 'onChange', { target: { checked: true } });
  await view.fire(unchecked, 'onChange', { target: { checked: true } });
  assert.match(view.text(), /Ajouter \(2\)/);
  await view.fire(checked, 'onChange', { target: { checked: false } });
  assert.match(view.text(), /Ajouter \(1\)/);
  await view.click((props, text) => /Ajouter \(1\)/.test(text ?? ''));
  assert.deepEqual(submitted, [['user-9']]);
});

test('MAIR-1165 the search filters by name or service, accents ignored, and an empty result shows the empty state', async () => {
  let cancelled = 0;
  view = mount(h(Harness, { onCancel: () => { cancelled++; } }));
  await view.fire(props => props.placeholder === 'Nom ou service', 'onChange', { target: { value: 'voirie' } });
  assert.match(view.text(), /Sophie Leroy/);
  assert.doesNotMatch(view.text(), /Thomas Bernard/);
  await view.fire(props => props.placeholder === 'Nom ou service', 'onChange', { target: { value: 'Zoé' } });
  assert.match(view.text(), /Aucun agent à ajouter/);
  await view.click((props, text) => /^Annuler$/.test((text ?? '').trim()));
  assert.equal(cancelled, 1);
});
