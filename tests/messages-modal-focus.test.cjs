const assert = require('node:assert/strict');
const { test } = require('node:test');
const { messagesDom } = require('./support/messages-dom.cjs');
const enabled = scope => [...scope.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]')]
  .filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[hidden], [aria-hidden="true"], [inert]'));

test('the actual new-message dialog receives focus, cycles Tab and returns focus after its close command', async t => {
  const dom = await messagesDom(t), opener = dom.button('Nouveau message');
  assert.ok(opener); opener.focus(); await dom.click(opener);
  const modal = dom.document.querySelector('[role="dialog"][aria-modal="true"]');
  assert.ok(modal); await dom.waitFor(() => modal.querySelectorAll('select option').length > 1);
  assert.ok(modal.contains(dom.document.activeElement), 'Focus must leave the background new-message trigger');
  const items = enabled(modal), first = items[0], last = items.at(-1); assert.ok(items.length > 1);
  const press = (node, key, shiftKey = false) => {
    const event = new dom.window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
    node.dispatchEvent(event); return event;
  };
  last.focus(); assert.equal(press(last, 'Tab').defaultPrevented, true); assert.equal(dom.document.activeElement, first);
  assert.equal(press(first, 'Tab', true).defaultPrevented, true); assert.equal(dom.document.activeElement, last);
  await dom.click(modal.querySelector('button[aria-label="Fermer"]'));
  await dom.waitFor(() => !dom.document.querySelector('[role="dialog"][aria-modal="true"]'));
  assert.equal(dom.document.activeElement, opener);
});
