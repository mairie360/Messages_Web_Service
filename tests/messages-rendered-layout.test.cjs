const assert = require('node:assert/strict');
const { test } = require('node:test');
const { messagesDom } = require('./support/messages-dom.cjs');

function shadow(window, value) {
  return value.split(/,(?![^()]*\))/).map((part) => {
    const tokens = part.trim().split(/\s+(?![^()]*\))/);
    const lengths = tokens.filter((token) => Number.isFinite(Number.parseFloat(token)));
    const colors = tokens.filter((token) => !Number.isFinite(Number.parseFloat(token)));
    assert.ok([3, 4].includes(lengths.length)); assert.equal(colors.length, 1);
    const pixels = lengths.map((token) => {
      const number = Number.parseFloat(token); assert.ok(number === 0 || token.endsWith('px')); return number;
    });
    if (pixels.length === 3) pixels.push(0);
    const probe = window.document.createElement('span'); probe.style.color = colors[0]; window.document.body.append(probe);
    try { return { lengths: pixels, color: window.getComputedStyle(probe).color }; }
    finally { probe.remove(); }
  });
}

test('actual messaging shell applies reference typography and bounded viewport preparation', async (t) => {
  const dom = await messagesDom(t), shell = dom.document.querySelector('.messages-app-root');
  assert.equal(dom.style(dom.document.documentElement).fontSize, '17px');
  assert.equal(dom.style(dom.document.body).fontFamily, 'system-ui, sans-serif');
  assert.equal(dom.style(shell).height, '100dvh'); assert.equal(Number.parseFloat(dom.style(shell).minHeight), 0);
  assert.equal(dom.style(shell).overflow, 'hidden');
  const wrapper = shell.querySelector(':scope > .flex');
  assert.equal(dom.style(wrapper).height, '100%'); assert.equal(Number.parseFloat(dom.style(wrapper).minHeight), 0);
  assert.equal(Number.parseFloat(dom.style(wrapper.querySelector(':scope > .flex')).minHeight), 0);
  assert.equal(dom.style(shell.querySelector('header')).flexShrink, '0');
});

test('actual messaging sidebar applies the reference row rhythm, position and outer shadow', async (t) => {
  const dom = await messagesDom(t), sidebar = dom.document.querySelector('aside[aria-label="Navigation principale"]');
  assert.equal(dom.style(sidebar).position, 'relative'); assert.equal(dom.style(sidebar).zIndex, '20');
  assert.deepEqual(shadow(dom.window, dom.style(sidebar).boxShadow), [{ lengths: [8, 0, 24, 0], color: 'rgba(12, 28, 48, 0.28)' }]);
  const buttons = [...sidebar.querySelectorAll('nav button')];
  assert.deepEqual(buttons.map((button) => button.textContent), ['Tableau de bord', 'Projets', 'Messagerie', 'Formation', 'Calendrier', 'Administration', 'Paramètres']);
  for (const button of buttons) {
    assert.equal(dom.style(button).minHeight, '44px'); assert.equal(dom.style(button).flexShrink, '0');
  }
});

test('actual published messaging drawer applies its lower layer and closes through its command', async (t) => {
  const dom = await messagesDom(t); await dom.click(dom.button('Ouvrir la navigation'));
  const drawer = dom.document.querySelector('[role="dialog"][aria-label="Navigation mobile"]'); assert.ok(drawer);
  assert.equal(dom.style(drawer.querySelector('aside')).zIndex, '0');
  await dom.click(dom.button('Fermer la navigation'));
  assert.equal(dom.document.querySelector('[role="dialog"][aria-label="Navigation mobile"]'), null);
});

test('actual messaging card fills its prepared space without clipping its outer shadow', async (t) => {
  const dom = await messagesDom(t), main = dom.document.querySelector('.messages-app-root main');
  assert.equal(dom.style(main).padding, '20px'); assert.equal(dom.style(main).display, 'flex');
  assert.equal(dom.style(main).overflow, 'hidden'); assert.equal(Number.parseFloat(dom.style(main).minHeight), 0);
  const inner = dom.document.querySelector('.messages-main-inner');
  assert.equal(dom.style(inner).width, '100%'); assert.equal(dom.style(inner).maxWidth, 'none');
  for (const selector of ['.messages-module-frame', '.messages-module-stack']) {
    const element = dom.document.querySelector(selector);
    assert.equal(Number.parseFloat(dom.style(element).minHeight), 0); assert.equal(dom.style(element).flexGrow, '1');
    // JSDOM omits the initial shorthand on the frame; any explicit clipping still fails.
    assert.equal(dom.style(element).overflow || 'visible', 'visible');
  }
  const module = dom.document.querySelector('.messages-module');
  assert.equal(dom.style(module).height, '100%'); assert.equal(Number.parseFloat(dom.style(module).minHeight), 0);
  assert.equal(dom.style(module).gridTemplateRows.replace(/\s+/g, ''), 'minmax(0,1fr)');
  assert.deepEqual(shadow(dom.window, dom.style(module).boxShadow), [
    { lengths: [0, 5, 15, 0], color: 'rgba(23, 32, 51, 0.14)' },
    { lengths: [0, 1, 3, 0], color: 'rgba(23, 32, 51, 0.12)' },
  ]);
});

test('actual pane switch changes list state while independent scroll regions and controls retain styles', async (t) => {
  const dom = await messagesDom(t);
  for (const name of ['Conversations', 'Messages de la conversation']) {
    const region = dom.document.querySelector(`[role="region"][aria-label="${name}"]`); assert.ok(region);
    assert.equal(region.tabIndex, 0); assert.equal(Number.parseFloat(dom.style(region).minHeight), 0);
    assert.equal(dom.style(region).overscrollBehavior, 'contain');
    if (name === 'Messages de la conversation') {
      assert.equal(dom.style(region).overflowX, 'hidden'); assert.equal(dom.style(region).overflowY, 'auto');
      assert.equal(dom.style(region).overflowWrap, 'anywhere');
    }
  }
  const controls = [...dom.document.querySelectorAll('.messages-module > div:nth-child(2) > :not(.flex-1)')];
  assert.ok(controls.length); for (const control of controls) assert.equal(dom.style(control).flexShrink, '0');
  const button = dom.button('Voir les conversations'); assert.equal(button.getAttribute('aria-pressed'), 'false');
  await dom.click(button); assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.ok(dom.document.querySelector('.messages-list-open'));
  await dom.click(dom.button('Retour à la conversation')); assert.equal(dom.document.querySelector('.messages-list-open'), null);
  assert.ok(dom.upstream.requests.every((request) => request.method === 'GET'), 'Presentation actions do not write or automatically acknowledge messages');
  // CSS media policies and native compiled panes remain separate from JSDOM.
});

test('actual unavailable bootstrap keeps the reference error presentation and explicit retry command', async (t) => {
  const dom = await messagesDom(t, { unavailable: true }), error = dom.document.querySelector('.messages-error');
  assert.ok(error.textContent.includes('Lecture initiale refusée')); assert.equal(dom.style(error).flexShrink, '0');
  assert.equal(dom.style(error).fontSize, '14px'); assert.equal(dom.style(error).lineHeight, '20px');
  assert.equal(dom.style(error).color, 'rgb(153, 27, 27)'); assert.ok(dom.button('Réessayer'));
  assert.equal(dom.document.querySelector('.messages-module'), null);
  assert.ok(dom.upstream.requests.every((request) => request.method === 'GET'));
  assert.ok(dom.fixtureExceptions.includes('Existing bootstrap503 fixture absent from published response statuses'));
});
