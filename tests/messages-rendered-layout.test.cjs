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

test('MAIR-838 actual messaging shell keeps the lib typography and fills the main area through mainLayout', async (t) => {
  const dom = await messagesDom(t);
  assert.equal(dom.document.querySelector('.messages-app-root'), null, 'No local frame class');
  assert.notEqual(dom.style(dom.document.documentElement).fontSize, '17px', 'No local root font size');
  assert.notEqual(dom.style(dom.document.body).fontFamily, 'system-ui, sans-serif', 'No local body font family');
  const main = dom.document.querySelector('main');
  assert.equal(main.getAttribute('data-layout'), 'fill');
  assert.ok(main.querySelector('.messages-main-inner'));
});

test('MAIR-838 the lib fill layout bounds the main area (flex, no overflow, 20px / 24px padding)', () => {
  const postcss = require('postcss');
  const { readFileSync } = require('node:fs');
  const lib = postcss.parse(readFileSync(require.resolve('@mairie360/lib-components/styles.css'), 'utf8'));
  const declarations = {};
  lib.walkRules('.app-shell-main-area[data-layout="fill"]', (rule) => {
    if (rule.parent.type === 'atrule') return;
    rule.walkDecls((decl) => { declarations[decl.prop] = decl.value; });
  });
  assert.deepEqual(
    { display: declarations.display, overflow: declarations.overflow, minHeight: declarations['min-height'], padding: declarations.padding },
    { display: 'flex', overflow: 'hidden', minHeight: '0', padding: '20px 24px' },
  );
});

test('actual messaging desktop navigation lists the active modules without local overrides', async (t) => {
  const dom = await messagesDom(t), navigation = dom.document.querySelector('aside[aria-label="Navigation principale"]');
  assert.ok(navigation);
  assert.equal(dom.style(navigation).position, 'static', 'No local position override');
  assert.ok(!dom.style(navigation).boxShadow || dom.style(navigation).boxShadow === 'none', 'No local shadow override');
  const buttons = [...navigation.querySelectorAll('nav button')];
  assert.deepEqual(buttons.map((button) => button.textContent), ['Tableau de bord', 'Projets', 'Messagerie', 'Formation', 'Calendrier', 'Administration', 'Paramètres']);
});

test('actual published messaging drawer opens and closes through its commands', async (t) => {
  const dom = await messagesDom(t); await dom.click(dom.button('Ouvrir la navigation'));
  assert.ok(dom.document.querySelector('[role="dialog"][aria-label="Navigation mobile"]'));
  await dom.click(dom.button('Fermer la navigation'));
  assert.equal(dom.document.querySelector('[role="dialog"][aria-label="Navigation mobile"]'), null);
});

test('actual messaging card fills its prepared space without clipping its outer shadow', async (t) => {
  const dom = await messagesDom(t);
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
  assert.equal(dom.style(error).color, 'var(--mairie-error-text)');
  assert.equal(dom.style(dom.document.documentElement).getPropertyValue('--mairie-error-text').trim(), '#a40e26'); assert.ok(dom.button('Réessayer'));
  assert.equal(dom.document.querySelector('.messages-module'), null);
  assert.ok(dom.upstream.requests.every((request) => request.method === 'GET'));
  assert.ok(dom.fixtureExceptions.includes('Existing bootstrap503 fixture absent from published response statuses'));
});
