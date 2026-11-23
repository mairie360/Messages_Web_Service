const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1164: node owns the coverage of every TSX file; the search results are only reached through the lib Drawer of
// the conversation search panel in the jsdom tests, so the result row is rendered here directly.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { SearchMessageResult } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/ConversationSearchPanel/components/SearchMessageResult/SearchMessageResult.tsx');

let view;
afterEach(() => { view?.unmount(); view = undefined; });
const h = React.createElement;

test('MAIR-1164 a found message shows its author, its date and its highlighted matches, and opens on click', async () => {
  const opened = [];
  const item = { messageId: 'message-12', authorId: 'user-7', authorName: 'Sophie Leroy', createdAt: '2026-11-20T09:30:00.000Z',
    excerpt: 'Le budget du budget annexe', highlights: [{ start: 3, length: 6 }, { start: 13, length: 6 }] };
  view = mount(h(SearchMessageResult, { item, onOpen: found => opened.push(found) }));
  assert.match(view.html, /data-search-message-id="message-12"/);
  assert.match(view.text(), /Sophie Leroy/);
  assert.equal((view.html.match(/<mark/g) || []).length, 2);
  assert.match(view.html, /<mark[^>]*>budget<\/mark>/);
  await view.click(props => props['data-search-message-id'] === 'message-12');
  assert.deepEqual(opened, [item]);
});

test('MAIR-1164 a message of a former member is labelled « Ancien membre » and keeps a plain excerpt', () => {
  view = mount(h(SearchMessageResult, { item: { messageId: 'message-3', createdAt: '2026-11-20T09:30:00.000Z', excerpt: 'Sans correspondance', highlights: [] }, onOpen() {} }));
  assert.match(view.text(), /Ancien membre/);
  assert.match(view.text(), /Sans correspondance/);
  assert.doesNotMatch(view.html, /<mark/);
});
