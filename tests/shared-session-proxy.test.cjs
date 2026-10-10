const assert = require('node:assert/strict');
const path = require('node:path');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { FrontNetwork } = require('./support/front-network.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { messageBffMock, tokenFor, users, bootstrap, message, conversation, apiError, currentUser } = require('./support/fixtures.cjs');
const { installBrowser } = require('./support/browser.cjs');
const { requireSrc } = require('./support/load-ts.cjs');
const business = messageBffMock();
const user = new ContractMockServer('BFF_USER', OpenApiContract.load(path.join(__dirname, 'fixtures/user-session-openapi.json')));
const network = new FrontNetwork([business, user]);
const browser = installBrowser();
const { messageClient } = requireSrc('clients/messageClient.ts');
const { logoutAndReload } = requireSrc('lib/logout.ts');
const { AppShell } = requireSrc('app/_components/app-shell.tsx');
let refresh, access, view;
before(async () => {
  await business.start(); await user.start();
  process.env.BFF_MESSAGE_BASE_URL = business.url;
  network.setOwner(user); network.install();
});
after(async () => { network.restore(); browser.restore(); await user.stop(); await business.stop(); });
beforeEach(() => {
  network.reset(); business.reset(); user.reset(); browser.reset();
  refresh = 'disposable-message-refresh-' + Math.random();
  access = tokenFor(users.agent.id);
  network.cookies = { accessToken: 'rejected-access', refreshToken: refresh };
});
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual([...network.violations, ...user.violations, ...business.violations], []); });
function renewed() {
  user.on('post', '/auth/refresh', { body: { message: 'JWT refreshed successfully' }, headers: { 'Set-Cookie': [
    `accessToken=${access}; Path=/auth; Max-Age=3600; HttpOnly; SameSite=Strict`,
    `refreshToken=rotated-${refresh}; Path=/auth; HttpOnly; SameSite=Strict`,
  ] } });
}
function rejectedRead() {
  business.on('get', '/messaging/bootstrap', call => call.headers.authorization === `Bearer ${access}`
    ? { body: bootstrap() } : { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée') });
}

test('three simultaneous message reads share one published User refresh and rotated cookie pair', async () => {
  renewed(); rejectedRead();
  const replies = await Promise.all([messageClient.getBootstrap(), messageClient.getBootstrap(), messageClient.getBootstrap()]);
  assert.equal(replies.length, 3); assert.equal(network.ownerCalls.length, 3);
  assert.equal(user.calls('/auth/refresh').length, 1);
  assert.deepEqual(user.calls('/auth/refresh')[0].body, { refresh_token: refresh });
  assert.equal(user.calls('/auth/refresh')[0].headers.authorization, undefined);
  assert.equal(business.requests.length, 6);
  assert.equal(network.cookies.accessToken, access); assert.equal(network.cookies.refreshToken, 'rotated-' + refresh);
  assert.ok(business.requests.every(call => call.headers.cookie === undefined));
});
test('missing access ignores a forged browser bearer and renews using the HttpOnly refresh cookie', async () => {
  delete network.cookies.accessToken; renewed(); rejectedRead();
  const reply = await fetch('/api/bff/messaging/bootstrap', { headers: { Authorization: 'Bearer forged-browser' } });
  assert.equal(reply.status, 200);
  assert.equal(business.requests[0].headers.authorization, undefined);
  assert.equal(business.requests[1].headers.authorization, `Bearer ${access}`);
});
test('a browser bearer without either session cookie cannot authenticate a business read', async () => {
  network.cookies = {};
  business.on('get', '/messaging/bootstrap', { status: 401, body: apiError('UNAUTHORIZED', 'No cookie') });
  const reply = await fetch('/api/bff/messaging/bootstrap', { headers: { Authorization: 'Bearer forged-browser' } });
  assert.equal(reply.status, 401);
  assert.equal(business.requests[0].headers.authorization, undefined);
  assert.equal(network.ownerCalls.length, 0);
});
for (const status of [401, 503]) test(`renewal${status} stops without replay or logout and preserves cookies`, async () => {
  rejectedRead(); network.ownerOverride = () => Response.json({ message: 'Disposable refusal' }, { status });
  await assert.rejects(messageClient.getBootstrap(), { status });
  assert.equal(business.requests.length, 1);
  assert.equal(network.cookies.refreshToken, refresh);
  assert.equal(user.calls('/auth/logout').length, 0);
  assert.deepEqual(browser.window.location.assigned, []);
});
test('malformed renewal and a second401 never loop or revoke the session', async () => {
  rejectedRead(); network.ownerOverride = () => Response.json({ message: 'No cookies' });
  await assert.rejects(messageClient.getBootstrap(), { status: 502 });
  assert.equal(business.requests.length, 1);
  network.ownerOverride = undefined; renewed();
  business.on('get', '/messaging/bootstrap', { status: 401, body: apiError('UNAUTHORIZED', 'Still refused') });
  await assert.rejects(messageClient.getBootstrap(), { status: 401 });
  assert.equal(business.requests.length, 3);
  assert.equal(user.calls('/auth/refresh').length, 1);
  assert.equal(user.calls('/auth/logout').length, 0);
});
test('a rejected send retries the exact published payload once and never adds a duplicate request', async () => {
  renewed();
  const payload = { content: 'Réunion à 14h', attachmentIds: ['attachment-1'], mentionIds: [users.sophie.id] };
  business.on('post', '/conversations/{conversationId}/messages', call => call.headers.authorization === `Bearer ${access}`
    ? { status: 201, body: { message: message(3, 4, payload.content), conversation: conversation(4, 'Équipe communication') } }
    : { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée') });
  await messageClient.sendMessage(4, payload);
  assert.deepEqual(business.requests.map(call => call.body), [payload, payload]);
  assert.equal(user.calls('/auth/refresh').length, 1);
});
test('multipart attachment bytes survive one rejected upload and one replay', async () => {
  renewed();
  business.on('post', '/attachments', call => call.headers.authorization === `Bearer ${access}`
    ? { status: 201, body: { attachments: [{ id: 'stored-1', name: 'agenda.txt', size: 6, type: 'text/plain' }] } }
    : { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée') });
  await messageClient.uploadAttachments([new File(['agenda'], 'agenda.txt', { type: 'text/plain' })]);
  assert.equal(business.requests.length, 2);
  assert.deepEqual(business.requests[0].rawBody, business.requests[1].rawBody);
  assert.equal(business.requests[0].headers['content-type'], business.requests[1].headers['content-type']);
});
test('foreign business reads and explicit logout cannot reach an owner or modify cookies', async () => {
  for (const [url, init] of [
    ['/api/bff/health', { headers: { Origin: 'https://foreign.mairie.test' } }],
    ['/api/auth/logout', { method: 'POST', headers: { Origin: 'https://foreign.mairie.test', 'Content-Type': 'application/json' }, body: '{}' }],
  ]) {
    const reply = await fetch(url, init);
    assert.equal(reply.status, 403); assert.equal(reply.headers.get('set-cookie'), null);
  }
  assert.equal(network.ownerCalls.length, 0); assert.equal(business.requests.length, 0); assert.equal(user.requests.length, 0);
  assert.equal(network.cookies.refreshToken, refresh);
});
test('concurrent explicit logout commands use one owner receipt before Login navigation', async () => {
  user.on('post', '/auth/logout', { body: { message: 'Closed', session_revoked: true } });
  await Promise.all([logoutAndReload(), logoutAndReload()]);
  assert.equal(network.ownerCalls.length, 1); assert.equal(user.calls('/auth/logout').length, 1);
  assert.equal(network.cookies.accessToken, undefined); assert.equal(network.cookies.refreshToken, undefined);
  assert.deepEqual(browser.window.location.assigned, ['https://login.mairie.test/']);
});
test('unconfirmed explicit revocation expires local cookies but keeps the failure visible without navigation', async () => {
  user.on('post', '/auth/logout', { body: { message: 'Unconfirmed', session_revoked: false } });
  await assert.rejects(logoutAndReload(), /La fermeture de la session serveur n’a pas pu être confirmée/);
  assert.deepEqual(browser.window.location.assigned, []); assert.equal(browser.window.location.reloads, 0);
  assert.deepEqual(network.cookies, {});
});


async function renderShell() {
  business.on('get', '/me', { body: currentUser() });
  view = mount(React.createElement(AppShell, { activeItem: 'messages' }, React.createElement('p', null, 'Preserved message zone')));
  await view.waitFor(() => view.props('Header').user.name === users.agent.name);
}
async function shellCommand(text) {
  const button = view.hostElements((_props, label, tag) => tag === 'button' && label === text)[0];
  assert.ok(button, 'Visible recovery command ' + text);
  await view.act(() => button.props.onClick());
}
test('actual Message shell keeps failed logout visible and an explicit retry can finish it', async () => {
  await renderShell();
  network.ownerOverride = () => Response.json({ message: 'Unavailable' }, { status: 503 });
  await view.act(() => view.props('Header').onLogout());
  await view.waitFor(html => html.includes('La déconnexion n’a pas abouti'));
  assert.match(view.html, /role="alert"/);
  assert.match(view.text(), /Preserved message zone|Réessayer|Retour à la connexion/);
  assert.deepEqual(browser.window.location.assigned, []);
  assert.equal(network.cookies.refreshToken, refresh);
  network.ownerOverride = undefined;
  user.on('post', '/auth/logout', { body: { message: 'Closed', session_revoked: true } });
  await shellCommand('Réessayer');
  await view.waitFor(() => browser.window.location.assigned.length === 1);
  assert.deepEqual(browser.window.location.assigned, ['https://login.mairie.test/']);
  assert.equal(user.calls('/auth/logout').length, 1);
});
test('actual Message shell retains unconfirmed revocation until explicit validated Login return', async () => {
  await renderShell();
  user.on('post', '/auth/logout', { body: { message: 'Unconfirmed', session_revoked: false } });
  await view.act(() => view.props('Header').onLogout());
  await view.waitFor(html => html.includes('La fermeture de la session serveur n’a pas pu être confirmée'));
  assert.deepEqual(browser.window.location.assigned, []);
  assert.deepEqual(network.cookies, {});
  await shellCommand('Retour à la connexion');
  assert.equal(browser.window.location.assigned.length, 1);
  assert.equal(new URL(browser.window.location.assigned[0]).searchParams.get('redirect'), browser.window.location.href);
  assert.equal(user.calls('/auth/logout').length, 1);
});
