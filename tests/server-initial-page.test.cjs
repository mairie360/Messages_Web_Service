const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { requireSrc } = require('./support/load-ts.cjs');
const { loadRootLayout } = require('./support/root-layout.cjs');
const fixtures = require('./support/fixtures.cjs');
const bag = {};
const { default: Page } = loadRootLayout(() => requireSrc('app/page.tsx'), bag);
const originalFetch = global.fetch;
const keys = ['MESSAGE_FRONT_URL', 'BFF_MESSAGE_BASE_URL', 'LOGIN_FRONT_URL'];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
let calls;
beforeEach(() => {
  process.env.MESSAGE_FRONT_URL = 'https://messages.mairie.test';
  process.env.BFF_MESSAGE_BASE_URL = 'https://message-bff.mairie.test';
  process.env.LOGIN_FRONT_URL = 'https://login.mairie.test';
  for (const key of Object.keys(bag)) delete bag[key];
  bag.accessToken = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + 600 })).toString('base64url') + '.signature';
  calls = [];
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
});
function transport(body, status = 200) {
  global.fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return Response.json(body, { status, headers: { 'Set-Cookie': 'privateSession=must-not-cross-server-boundary' } });
  };
}
async function initialPage(params = {}) {
  const tree = await Page({ searchParams: Promise.resolve(params) });
  return { tree, html: renderToStaticMarkup(tree) };
}
test('the real server page renders confirmed conversations and messages without effects or a browser', async () => {
  const data = fixtures.bootstrap();
  data.messages[0].content = 'Server confirmed municipal message';
  transport({ ...data, privateToken: 'must-not-serialize', currentUser: { ...data.currentUser, refreshToken: 'must-not-serialize' } });
  const { html, tree } = await initialPage();
  assert.match(html, /Server confirmed municipal message/);
  assert.match(html, /Équipe communication/);
  assert.doesNotMatch(JSON.stringify(tree.props), /must-not-serialize|signature|privateSession/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, 'https://message-bff.mairie.test');
  assert.equal(calls[0].url.pathname, '/messaging/bootstrap');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.headers.get('Authorization'), `Bearer ${bag.accessToken}`);
  assert.equal(calls[0].init.headers.get('Cookie'), null);
});
for (const status of [401, 503]) test(`a server ${status} is explicit and never becomes confirmed message content`, async () => {
  transport({ error: { message: 'Untrusted secret must-not-serialize' } }, status);
  const { html, tree } = await initialPage();
  assert.match(html, /premier chargement de la messagerie est indisponible/);
  assert.doesNotMatch(JSON.stringify(tree.props), /must-not-serialize|signature/);
  assert.equal(calls.length, 1);
});
test('invalid message data is rejected rather than represented as a successful empty page', async () => {
  transport({ ...fixtures.bootstrap(), conversations: 'invalid' });
  const { html } = await initialPage();
  assert.match(html, /premier chargement de la messagerie est indisponible/);
  assert.equal(calls.length, 1);
});
for (const token of [undefined, 'opaque', 'e30.eyJleHAiOjF9.signature']) test(`a missing, opaque or expired access context makes no upstream request: ${token ?? 'missing'}`, async () => {
  bag.accessToken = token;
  transport(fixtures.bootstrap());
  const { html } = await initialPage();
  assert.match(html, /premier chargement de la messagerie est indisponible/);
  assert.equal(calls.length, 0);
});
test('invalid public frontend configuration cannot derive an origin or contact the BFF', async () => {
  process.env.MESSAGE_FRONT_URL = 'https://user:password@messages.mairie.test';
  transport(fixtures.bootstrap());
  const { html } = await initialPage();
  assert.match(html, /premier chargement de la messagerie est indisponible/);
  assert.equal(calls.length, 0);
});

test('the route loading boundary has a persistent status and no animation dependency', () => {
  const Loading = requireSrc('app/loading.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-hidden="true"/);
});

test('a server conversation link is authorized through the real published thread read', async () => {
  global.fetch = async (url, init) => {
    const target = new URL(url); calls.push({ url: target, init });
    return Response.json(target.pathname === '/messaging/bootstrap' ? fixtures.bootstrap() : { conversation: fixtures.conversation(5, 'Linked authorized conversation'), messages: [fixtures.message(80, 5, 'Linked server message')] });
  };
  const { html } = await initialPage({ conversation: 'conversation-5' });
  assert.match(html, /Linked authorized conversation/);
  assert.match(html, /Linked server message/);
  assert.deepEqual(calls.map(call => call.url.pathname), ['/messaging/bootstrap', '/conversations/conversation-5/messages']);
});
test('a foreign thread receipt cannot confirm the requested server conversation', async () => {
  global.fetch = async (url, init) => {
    const target = new URL(url); calls.push({ url: target, init });
    return Response.json(target.pathname === '/messaging/bootstrap' ? fixtures.bootstrap() : { conversation: fixtures.conversation(6, 'Foreign conversation'), messages: [fixtures.message(80, 6, 'Foreign message')] });
  };
  const { html } = await initialPage({ conversation: 'conversation-5' });
  assert.match(html, /premier chargement de la messagerie est indisponible/);
  assert.doesNotMatch(html, /Foreign message/);
});

test('separate server renders reset the client lifetime with a fresh opaque key', async () => {
  transport(fixtures.bootstrap());
  const first = await Page({ searchParams: Promise.resolve({}) });
  const second = await Page({ searchParams: Promise.resolve({}) });
  assert.equal(typeof first.key, 'string');
  assert.notEqual(first.key, second.key);
  assert.doesNotMatch(first.key, /signature|accessToken|refreshToken/);
});

test('a transport failure remains an explicit unavailable receipt without serializing its exception', async () => {
  global.fetch = async () => { throw new Error('transport-private-canary'); };
  const { tree } = await initialPage();
  assert.equal(tree.props.initial.status, 'unavailable');
  assert.doesNotMatch(JSON.stringify(tree.props), /transport-private-canary/);
});
