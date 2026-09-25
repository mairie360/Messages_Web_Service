const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

const { prepareMessagingScrollRegions } = requireSrc('app/_components/messaging-scroll-regions.ts');

test('both published messaging scroll panes are keyboard reachable and named', () => {
  const regions = new Map();
  const container = {
    querySelector(selector) {
      const attributes = {};
      const region = { tabIndex: -1, attributes, setAttribute(name, value) { attributes[name] = value; } };
      regions.set(selector, region);
      return region;
    },
  };

  prepareMessagingScrollRegions(container);

  assert.deepEqual([...regions.entries()].map(([selector, region]) => [selector, region.tabIndex, region.attributes]), [
    ['.messages-module > aside > div:last-child', 0, { role: 'region', 'aria-label': 'Conversations' }],
    ['.messages-module > div:nth-child(2) > .flex-1', 0, { role: 'region', 'aria-label': 'Messages de la conversation' }],
  ]);
});

test('absent panes and unmounts do not fail', () => {
  prepareMessagingScrollRegions(null);
  prepareMessagingScrollRegions({ querySelector() { return null; } });
});
