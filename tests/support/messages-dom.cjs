const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { ROOT, requireSrc } = require('./load-ts.cjs');
const fixtures = require('./fixtures.cjs');
const { FrontNetwork } = require('./front-network.cjs');

/** Actual page/hooks/components/routes against the existing contract-mock fixtures. */
async function messagesDom(t, { unavailable = false } = {}) {
  const keys = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement',
    'MutationObserver', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent',
    'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
    'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const errors = [], console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5003/', pretendToBeVisual: true, virtualConsole: console,
  });
  const upstream = fixtures.messageBffMock(), network = new FrontNetwork([upstream]);
  const beforeEnv = process.env.BFF_MESSAGE_BASE_URL;
  let reactRoot, React;
  t.after(async () => {
    try {
      if (reactRoot) await React.act(async () => reactRoot.unmount());
      network.restore(); dom.window.close(); await upstream.stop();
      assert.deepEqual([...upstream.violations, ...network.violations], []);
      assert.deepEqual(errors, [], 'Actual stylesheet and DOM effects must be accepted');
    } finally {
      if (beforeEnv === undefined) delete process.env.BFF_MESSAGE_BASE_URL;
      else process.env.BFF_MESSAGE_BASE_URL = beforeEnv;
      for (const key of keys) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
        else delete globalThis[key];
      }
    }
  });
  for (const key of keys.filter((key) => !['getComputedStyle', 'requestAnimationFrame',
    'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'].includes(key))) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key] });
  }
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // No breakpoint or native geometry claims from these inert platform adapters.
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.ResizeObserver = global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  const style = dom.window.document.createElement('style');
  style.textContent = fs.readFileSync(path.join(ROOT, 'src/app/app-shell.css'), 'utf8');
  dom.window.document.head.append(style);
  await upstream.start(); process.env.BFF_MESSAGE_BASE_URL = upstream.url;
  network.install(); network.cookies.accessToken = fixtures.tokenFor(fixtures.users.agent.id);
  const admin = fixtures.currentUser({ role: 'Admin' });
  const bootstrap = { ...fixtures.bootstrap(), currentUser: admin.currentUser };
  upstream.on('get', '/me', { body: admin });
  upstream.on('get', '/messaging/bootstrap', unavailable
    ? { status: 503, body: fixtures.apiError('UNAVAILABLE', 'Lecture initiale refusée'), outOfContract: true }
    : { body: bootstrap });
  // Existing published-contract defects, already explicit in messages-page.contract-mocks:
  // GET thread response model is swapped; bootstrap503 is absent from its success/401 export.
  // Reuse those fixtures; no strict response-schema certification of these two exceptions.
  upstream.on('get', '/conversations/{conversationId}/messages', {
    body: { conversation: bootstrap.conversations[0], messages: bootstrap.messages }, outOfContract: true,
  });
  upstream.on('get', '/contacts', { body: { contacts: bootstrap.contacts } });
  upstream.on('get', '/conversations', { body: { conversations: bootstrap.conversations } });
  upstream.on('get', '/business-references', { body: fixtures.businessReferences() });
  const { setBrowserFrontUrls } = requireSrc('lib/front-urls.ts');
  setBrowserFrontUrls({ LOGIN_FRONT_URL: 'https://login.example/', DASHBOARD_FRONT_URL: 'https://dashboard.example/',
    PROJECT_FRONT_URL: 'https://projects.example/', MESSAGE_FRONT_URL: 'http://localhost:5003/',
    ELEARNING_FRONT_URL: 'https://training.example/', CALENDAR_FRONT_URL: 'https://calendar.example/',
    ADMINISTRATION_FRONT_URL: 'https://admin.example/', SETTINGS_FRONT_URL: 'https://settings.example/' });
  t.after(() => setBrowserFrontUrls({}));
  React = require('react');
  const { createRoot } = require('react-dom/client'), Page = requireSrc('app/page.tsx').default;
  reactRoot = createRoot(dom.window.document.getElementById('root'));
  await React.act(async () => reactRoot.render(React.createElement(Page)));
  async function waitFor(predicate) {
    for (let attempt = 0; attempt < 100 && !predicate(); attempt += 1) {
      await React.act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    }
    assert.ok(predicate(), 'Actual messaging page must reach the expected state');
  }
  await waitFor(() => dom.window.document.body.textContent.includes('Agent Mairie') &&
    dom.window.document.querySelector(unavailable ? '.messages-error' : '.messages-module'));
  const button = (name) => [...dom.window.document.querySelectorAll('button')]
    .find((element) => element.getAttribute('aria-label') === name || element.textContent.trim() === name);
  const click = async (element) => {
    assert.ok(element, 'Expected a real rendered command');
    await React.act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  };
  return { window: dom.window, document: dom.window.document, upstream, network, button, click, waitFor,
    style: (element) => dom.window.getComputedStyle(element),
    fixtureExceptions: ['Existing swapped GET thread response model', ...(unavailable ? ['Existing bootstrap503 fixture absent from published response statuses'] : [])] };
}

module.exports = { messagesDom };
