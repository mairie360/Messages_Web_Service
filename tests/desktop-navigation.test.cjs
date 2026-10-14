const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');

// Exercise the real component and React DOM, independently of legacy SSR stubs.
const originalResolve = Module._resolveFilename;
const extensions = { ts: require.extensions['.ts'], tsx: require.extensions['.tsx'] };
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.resolve(__dirname, '../src', request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, inlineSourceMap: true, inlineSources: true },
}).outputText, file);
const Navigation = require('../src/components/desktop-navigation.tsx').default;
after(() => {
  Module._resolveFilename = originalResolve;
  for (const [key, value] of Object.entries(extensions)) {
    if (value) require.extensions['.' + key] = value;
    else delete require.extensions['.' + key];
  }
});

async function fixture(t, props = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://settings.example.test/', pretendToBeVisual: true });
  const previous = new Map();
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'FocusEvent', 'KeyboardEvent', 'IS_REACT_ACT_ENVIRONMENT']) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'window' ? dom.window : key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] });
  }
  const container = dom.window.document.getElementById('root');
  const root = createRoot(container);
  const navigate = [], collapsed = [];
  const render = extra => React.act(async () => root.render(React.createElement(Navigation, { hrefs: { settings: '/settings' }, onNavigate: (...args) => navigate.push(args), onCollapsedChange: value => collapsed.push(value), ...props, ...extra })));
  t.after(async () => {
    await React.act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await render();
  return { dom, container, navigate, collapsed, render, act: React.act,
    click: element => React.act(async () => element.click()),
    send: (element, type, options) => React.act(async () => element.dispatchEvent(new dom.window.Event(type, { bubbles: true, ...options }))),
  };
}

test('collapse keeps named commands, versioned preference, focus tooltip and Escape', async t => {
  const f = await fixture(t);
  const toggle = f.container.querySelector('button[aria-expanded]');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  const navId = toggle.getAttribute('aria-controls');
  assert.equal(f.container.querySelector('nav').id, navId);
  await f.click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.match(f.dom.window.document.cookie, /mairie360_sidebar=v1:collapsed/);
  const settings = f.container.querySelector('button[aria-label="Paramètres"]');
  await f.act(async () => settings.focus());
  assert.equal(f.container.querySelector('[role="tooltip"]').textContent, 'Paramètres');
  assert.equal(settings.getAttribute('aria-describedby'), f.container.querySelector('[role="tooltip"]').id);
  await f.act(async () => settings.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(f.container.querySelector('[role="tooltip"]'), null);
  await f.click(settings);
  assert.deepEqual(f.navigate, [['/settings', 'settings']]);
  await f.click(toggle);
  assert.match(f.dom.window.document.cookie, /mairie360_sidebar=v1:expanded/);
  assert.equal(f.collapsed.at(-1), false);
});

test('hover tooltip is reachable and dismisses after leaving; another module preference is reread', async t => {
  const f = await fixture(t);
  await f.click(f.container.querySelector('button[aria-expanded]'));
  const settings = f.container.querySelector('button[aria-label="Paramètres"]');
  await f.send(settings, 'mouseover');
  const tip = f.container.querySelector('[role="tooltip"]');
  assert.ok(tip);
  await f.send(settings, 'mouseout');
  await f.send(tip, 'mouseover');
  await f.act(async () => new Promise(resolve => setTimeout(resolve, 170)));
  assert.ok(f.container.querySelector('[role="tooltip"]'));
  await f.send(tip, 'mouseout');
  await f.act(async () => new Promise(resolve => setTimeout(resolve, 170)));
  assert.equal(f.container.querySelector('[role="tooltip"]'), null);
  f.dom.window.document.cookie = 'mairie360_sidebar=v1:expanded; Path=/';
  await f.send(f.dom.window, 'focus');
  assert.equal(f.container.querySelector('button[aria-expanded]').getAttribute('aria-expanded'), 'true');
});

test('destinations, role filtering, badges, brand failure and inert dialogs are preserved', async t => {
  const f = await fixture(t, { hrefs: { settings: '/settings', admin: '/admin', projects: 'javascript:alert(1)', messages: 'https://user:password@invalid.test/', calendar: '//invalid.test/' } });
  assert.equal(f.container.querySelectorAll('nav button').length, 1);
  await f.render({ isAdmin: true, activeItem: 'settings', inactive: true, sidebarProps: { brandLogoSrc: '/missing.svg' } });
  assert.equal(f.container.querySelectorAll('nav button').length, 2);
  assert.equal(f.container.querySelector('aside').hasAttribute('inert'), true);
  assert.equal(f.container.querySelector('button[aria-label="Paramètres"]').getAttribute('aria-current'), 'page');
  await f.send(f.container.querySelector('img'), 'error');
  assert.equal(f.container.querySelector('img'), null);
  assert.equal(f.container.querySelector('.app-navigation-initial').textContent, 'M');
  await f.render({ sidebarProps: { items: [{ id: 'settings', label: 'Paramètres', icon: () => React.createElement('svg'), badge: '3' }] } });
  assert.ok(f.container.querySelector('button[aria-label="Paramètres (3)"]'));
});

test('unavailable browser storage does not prevent local collapse or callback navigation', async t => {
  const f = await fixture(t, { hrefs: {}, onPageChange: id => f.navigate.push(id) });
  Object.defineProperty(f.dom.window.document, 'cookie', { configurable: true, get() { throw new Error('blocked'); }, set() { throw new Error('blocked'); } });
  await f.click(f.container.querySelector('button[aria-expanded]'));
  assert.equal(f.container.querySelector('button[aria-expanded]').getAttribute('aria-expanded'), 'false');
  await f.click(f.container.querySelector('button[aria-label="Paramètres"]'));
  assert.deepEqual(f.navigate, ['settings']);
});
