const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const fixtures = require('./support/fixtures.cjs');

installReactRuntime();
const React = require('react');
const { useMessagingController } = requireSrc('components/MessagesPage/use-messaging-controller.ts');

test('group feedback waits for the server-created group and cannot survive a new refused action', async t => {
  const previous = { window: global.window, document: global.document, fetch: global.fetch, Event: global.Event };
  // A hidden document prevents background reception; only explicit action transport is replaced.
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://messages.example/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.Event = dom.window.Event;
  const writes = [];
  let settle;
  global.fetch = async (url, options = {}) => {
    assert.equal(String(url), '/groups');
    assert.equal(options.method, 'POST');
    writes.push(JSON.parse(options.body));
    return new Promise(resolve => { settle = resolve; });
  };
  let controller;
  const initial = { status: 'confirmed', data: fixtures.bootstrap(), requested: '' };
  function Probe() {
    controller = useMessagingController({ initial });
    return React.createElement('p', null, controller.feedback ?? '');
  }
  const view = mount(React.createElement(Probe));
  t.after(() => {
    view.unmount(); dom.window.close();
    global.window = previous.window; global.document = previous.document; global.fetch = previous.fetch; global.Event = previous.Event;
  });
  const pending = controller.handleCreateGroup({ name: 'Équipe demandée', memberIds: ['user-7'] });
  await view.waitFor(() => writes.length === 1);
  assert.equal(controller.feedback ?? null, null, 'A pending group cannot be reported as created');
  settle(Response.json({ conversation: fixtures.conversation(77, 'Équipe confirmée') }));
  assert.equal(await pending, true, controller.error ?? 'A valid returned group is accepted');
  await view.waitFor(() => controller.activeConversationId === 'conversation-77');
  assert.equal(controller.feedback, 'Groupe « Équipe confirmée » créé.');

  const refused = controller.handleCreateGroup({ name: 'Brouillon refusé', memberIds: ['user-9'] });
  await view.waitFor(() => writes.length === 2);
  assert.equal(controller.feedback, null, 'Starting another write clears the earlier action receipt');
  settle(Response.json(fixtures.apiError('FORBIDDEN', 'Création refusée'), { status: 403 }));
  assert.equal(await refused, false);
  await view.waitFor(() => Boolean(controller.error));
  assert.equal(controller.feedback, null);
  assert.equal(controller.activeConversationId, 'conversation-77');
  assert.match(controller.error, /Création refusée/);
  assert.equal(writes.length, 2);

  const malformed = controller.handleCreateGroup({ name: 'Sans reçu', memberIds: ['user-7'] });
  await view.waitFor(() => writes.length === 3);
  settle(Response.json({ conversation: { name: 'Groupe sans identifiant' } }));
  assert.equal(await malformed, false);
  await view.waitFor(() => controller.error?.includes('pas été confirmée'));
  assert.equal(controller.feedback, null);
  assert.equal(controller.activeConversationId, 'conversation-77', 'An incomplete receipt cannot replace the selected thread');
});
