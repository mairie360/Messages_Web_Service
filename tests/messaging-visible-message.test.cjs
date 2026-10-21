const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

// MAIR-607: the geometry rule that picks the last visible message came back from the
// library; the jsdom tests cover the Messaging flow, this covers the rule itself.
const { lastVisibleMessagingMessageId } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/visible-message.ts');

function element({ rect, style = {}, hidden = false, attributes = {}, parent = null, dataset = {}, messages = [] }) {
  const node = {
    hidden, parentElement: parent, dataset,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...rect }),
    hasAttribute: (name) => name in attributes,
    getAttribute: (name) => attributes[name] ?? null,
    querySelectorAll: () => messages,
    style: { display: 'block', visibility: 'visible', overflowY: 'visible', overflowX: 'visible', ...style },
  };
  return node;
}
function tree({ documentHidden = false, view = { innerHeight: 800, innerWidth: 1200 }, ...region }) {
  const document = { hidden: documentHidden, defaultView: { ...view, getComputedStyle: (node) => node.style } };
  const node = element(region);
  node.ownerDocument = document;
  return node;
}
const message = (id, rect, extra = {}) => element({ rect: { width: 400, height: 40, left: 0, right: 400, ...rect }, dataset: { messagingMessageId: id }, ...extra });

test('MAIR-607 returns null without a region, with a hidden document or a hidden ancestor', () => {
  assert.equal(lastVisibleMessagingMessageId(null), null);
  assert.equal(lastVisibleMessagingMessageId(tree({ documentHidden: true, rect: { top: 0, bottom: 500, right: 600 } })), null);
  const inert = element({ rect: { top: 0, bottom: 500, right: 600 }, attributes: { inert: '' } });
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, parent: inert })), null);
  const ariaHidden = element({ rect: { top: 0, bottom: 500, right: 600 }, attributes: { 'aria-hidden': 'true' } });
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, parent: ariaHidden })), null);
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, style: { display: 'none' } })), null);
});

test('MAIR-607 picks the last message inside the visible area and skips hidden or empty ones', () => {
  const messages = [message('m1', { top: 0, bottom: 40 }), message('m2', { top: 100, bottom: 140 }), message('m3', { top: 900, bottom: 940 }), message('m4', { top: 200, bottom: 240 }, { hidden: true }), message('m5', { top: 300, bottom: 300, height: 0 })];
  const region = tree({ rect: { top: 0, bottom: 500, right: 600 }, messages });
  assert.equal(lastVisibleMessagingMessageId(region), 'm2');
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, messages: [message('m1', { top: 900, bottom: 940 })] })), null);
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, messages: [] })), null);
});

test('MAIR-607 respects clipping ancestors and an off-screen region', () => {
  const clipper = element({ rect: { top: 0, bottom: 120, left: 0, right: 600 }, style: { overflowY: 'auto', overflowX: 'hidden' } });
  const messages = [message('m1', { top: 0, bottom: 40 }), message('m2', { top: 100, bottom: 140 }), message('m3', { top: 300, bottom: 340 })];
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, parent: clipper, messages })), 'm2');
  const offscreen = tree({ rect: { top: 900, bottom: 1300, right: 600 }, messages });
  assert.equal(lastVisibleMessagingMessageId(offscreen), null);
  const collapsed = element({ rect: { top: 0, bottom: 500, right: 600 }, style: { visibility: 'collapse' } });
  assert.equal(lastVisibleMessagingMessageId(tree({ rect: { top: 0, bottom: 500, right: 600 }, parent: collapsed, messages })), null);
});
