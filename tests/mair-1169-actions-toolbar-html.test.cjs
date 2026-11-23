const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1169: node owns the coverage of every TSX file. The actions toolbar of a message is only mounted from the first
// hover, focus or long press of its bubble (it was rendered for every message and doubled the render of a thread), so
// the server render of the page no longer reaches it: it is rendered here directly.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { MessageActionsToolbar } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble/components/MessageActionsToolbar/MessageActionsToolbar.tsx');

let view;
afterEach(() => { view?.unmount(); view = undefined; });
const h = React.createElement;
const button = label => props => props['aria-label'] === label && typeof props.onClick === 'function';

test('MAIR-1169 my message offers Réagir, Répondre, Modifier and Supprimer, each calling its action', async () => {
  const calls = [];
  const on = name => () => calls.push(name);
  view = mount(h(MessageActionsToolbar, { open: true, outgoing: true, onReact: on('react'), onReply: on('reply'), onEdit: on('edit'), onDelete: on('delete') }));
  assert.match(view.html, /role="toolbar"/);
  assert.match(view.html, /data-open="true"/);
  for (const label of ['Réagir', 'Répondre', 'Modifier', 'Supprimer']) await view.click(button(label));
  assert.deepEqual(calls, ['react', 'reply', 'edit', 'delete']);
});

test('MAIR-1169 a message of someone else offers neither Modifier nor Supprimer, and no action renders nothing', () => {
  view = mount(h(MessageActionsToolbar, { outgoing: false, onReply() {}, onEdit() {}, onDelete() {} }));
  assert.match(view.html, /aria-label="Répondre"/);
  assert.doesNotMatch(view.html, /aria-label="(Modifier|Supprimer)"/);
  view.unmount();
  view = mount(h(MessageActionsToolbar, { outgoing: false, onEdit() {}, onDelete() {} }));
  assert.equal(view.html, '');
});
