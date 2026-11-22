const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1164: the Node coverage owns every `.ts` module (scripts/coverage-scope.cjs), so the helpers of the search
// panel run here: the highlighted excerpt, the scroll to a message and the debounced search of the three tabs.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const MESSAGING = 'components/MessagesPage/components/MessagesWorkspace/components/Messaging';
const { highlightSegments } = requireSrc(`${MESSAGING}/components/ConversationSearchPanel/search-highlights.ts`);
const { useConversationSearch, SEARCH_TYPES } = requireSrc(`${MESSAGING}/components/ConversationSearchPanel/use-conversation-search.ts`);
const { revealMessage, REVEAL_HIGHLIGHT_MS } = requireSrc(`${MESSAGING}/reveal-message.ts`);
const { SearchMessageResult } = requireSrc(`${MESSAGING}/components/ConversationSearchPanel/components/SearchMessageResult/SearchMessageResult.tsx`);

let view;
afterEach(() => { view?.unmount(); view = undefined; });

test('MAIR-1164 an excerpt is cut around the matches the BFF located, ignoring invalid ones', () => {
  assert.deepEqual(highlightSegments('Le permis est signé', [{ start: 3, length: 6 }, { start: 4, length: 2 }, { start: -1, length: 2 }, { start: 90, length: 1 }]), [
    { text: 'Le ', match: false }, { text: 'permis', match: true }, { text: ' est signé', match: false },
  ]);
  assert.deepEqual(highlightSegments('permis', [{ start: 0, length: 6 }]), [{ text: 'permis', match: true }]);
  assert.deepEqual(highlightSegments('', []), [{ text: '', match: false }]);
});

test('MAIR-1164 the thread scrolls to a loaded message and highlights it for a moment', async () => {
  const timers = [];
  const attributes = new Map();
  let scrolled;
  let focused;
  const target = {
    dataset: { messagingMessageId: 'message-7' },
    scrollIntoView: options => { scrolled = options; },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    querySelector: () => ({ focus: options => { focused = options; } }),
  };
  const view = { matchMedia: () => ({ matches: true }), setTimeout: (run, delay) => timers.push([run, delay]) };
  const region = { ownerDocument: { defaultView: view }, querySelectorAll: () => [{ dataset: { messagingMessageId: 'message-1' } }, target] };
  assert.equal(revealMessage(null, 'message-7'), false);
  assert.equal(revealMessage(region, 'message-9'), false);
  assert.equal(revealMessage(region, 'message-7'), true);
  assert.deepEqual(scrolled, { behavior: 'auto', block: 'center' }, 'no animation under prefers-reduced-motion');
  assert.deepEqual(focused, { preventScroll: true });
  assert.ok(attributes.has('data-revealed'));
  assert.equal(timers[0][1], REVEAL_HIGHLIGHT_MS);
  timers[0][0]();
  assert.ok(!attributes.has('data-revealed'));
  view.matchMedia = () => ({ matches: false });
  revealMessage(region, 'message-7');
  assert.equal(scrolled.behavior, 'smooth');
});

test('MAIR-1164 the three tabs are searched together once the agent stops typing, then page by page', async () => {
  const calls = [];
  let failNext = false;
  const onSearch = async request => {
    calls.push(request);
    if (failNext) { failNext = false; throw new Error('down'); }
    return { type: request.type, items: [{ id: `${request.type}-${request.offset ?? 0}`, name: 'x' }], hasMore: request.type === 'messages' && !request.offset, total: 2 };
  };
  let search;
  let setQuery;
  const Probe = () => {
    const [query, update] = React.useState('');
    setQuery = update;
    search = useConversationSearch('conversation-4', query, onSearch);
    return React.createElement('p', null, search.status);
  };
  view = mount(React.createElement(Probe));
  assert.equal(search.status, 'idle');
  await view.act(() => setQuery('per'));
  await view.act(() => setQuery('permis'));
  assert.equal(search.status, 'loading');
  await view.waitFor(() => search.status === 'ready');
  assert.deepEqual(calls.map(call => `${call.type}:${call.query}`), SEARCH_TYPES.map(type => `${type}:permis`), 'debounced: one request per tab');
  await view.act(() => search.loadMore('messages'));
  await view.waitFor(() => search.pages.messages.items.length === 2);
  assert.equal(calls.at(-1).offset, 1);
  await search.loadMore('files');
  assert.equal(calls.length, 4, 'a tab without more results is not read again');
  failNext = true;
  await view.act(() => search.retry());
  await view.waitFor(() => search.status === 'error');
  await view.act(() => search.retry());
  await view.waitFor(() => search.status === 'ready');
  await view.act(() => setQuery(''));
  assert.equal(search.status, 'idle');
});

test('MAIR-1164 a found message shows its author and its marked excerpt, and opens the message', () => {
  const opened = [];
  const item = { messageId: 'message-7', createdAt: '2026-06-23T12:32:00Z', excerpt: 'Le permis est signé', highlights: [{ start: 3, length: 6 }] };
  view = mount(React.createElement(SearchMessageResult, { item, onOpen: found => opened.push(found.messageId) }));
  assert.match(view.html, /<mark[^>]*>permis<\/mark>/);
  assert.match(view.text(), /Ancien membre/);
  view.click(props => props['data-search-message-id'] === 'message-7');
  assert.deepEqual(opened, ['message-7']);
});
