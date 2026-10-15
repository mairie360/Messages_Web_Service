const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, describe, test } = require('node:test');
const React = require('react');
const { installBrowser, waitFor, withFakeHooks } = require('./support/browser.cjs');
const { apiError, currentUser, messageBffMock, tokenFor, users } = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { requireSrc } = require('./support/load-ts.cjs');

// Session du front : l'utilisateur courant vient de BFF Message (`GET /me`, via le proxy contractuel), seul BFF
// du front ; la déconnexion est une route locale qui efface le cookie sans appel réseau.

const messageBff = messageBffMock();
const network = new FrontNetwork([messageBff]);
const browser = installBrowser();
const { fetchAuthSession, logoutAndReload, normalizeAppRole, toAuthSession, useAuthSession } = requireSrc('lib/auth-session.ts');

const agentToken = tokenFor(users.agent.id);
const upstream = () => messageBff.requests.map((call) => `${call.method} ${call.url.pathname}`);

before(async () => {
  await messageBff.start();
  process.env.BFF_MESSAGE_BASE_URL = messageBff.url;
  network.install();
});
after(async () => {
  network.restore();
  browser.restore();
  await messageBff.stop();
});
beforeEach(() => {
  messageBff.reset();
  network.reset();
  browser.reset();
  delete process.env.COOKIE_DOMAIN;
  network.cookies.accessToken = agentToken;
});
afterEach(() => {
  assert.deepEqual([...messageBff.violations, ...network.violations], []);
});

describe('fetchAuthSession maps the BFF Message current user', () => {
  test('an authenticated session exposes the profile and the normalised role', async () => {
    messageBff.on('get', '/me', { body: currentUser({ role: 'ROLE_administrateur', city: ' Nantes ' }) });

    const result = await fetchAuthSession();

    assert.deepEqual(result, {
      status: 'authenticated',
      session: {
        user: {
          name: 'Agent Mairie', email: users.agent.email, role: 'Admin', service: 'Voirie', phone: '0102030405',
          avatarUrl: undefined, position: undefined, address: undefined, city: 'Nantes', lastConnection: undefined,
        },
        role: 'Admin',
        isAdmin: true,
        loading: false,
        error: null,
      },
    });
    assert.deepEqual(network.browserCalls, [{ method: 'GET', path: '/me' }]);
    assert.deepEqual(upstream(), ['GET /me']);
    assert.equal(messageBff.requests[0].headers.authorization, `Bearer ${agentToken}`);
  });

  test('401 is reported as unauthorized and other failures as unavailable', async () => {
    messageBff.on('get', '/me', { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée'), outOfContract: true });
    assert.deepEqual(await fetchAuthSession(), { status: 'unauthorized' });

    messageBff.on('get', '/me', { status: 500, raw: 'Erreur', contentType: 'text/plain', outOfContract: true });
    assert.deepEqual(await fetchAuthSession(), { status: 'error', error: 'Les informations du profil sont indisponibles.' });

    messageBff.on('get', '/me', { dropConnection: true });
    assert.deepEqual(await fetchAuthSession(), { status: 'error', error: 'Les informations du profil sont indisponibles.' });
  });
});

describe('useAuthSession', () => {
  const renderHook = () => withFakeHooks(React, (hooks) => ({ hooks, initial: useAuthSession() }));

  test('starts as a loading guest then stores the loaded session', async () => {
    messageBff.on('get', '/me', { body: currentUser() });

    const { hooks, initial } = renderHook();

    assert.deepEqual([initial.loading, initial.role, initial.user.name], [true, 'Guest', 'Chargement…']);
    await waitFor(() => hooks.updates > 0);
    assert.deepEqual([hooks.state.loading, hooks.state.user.name, hooks.state.role, hooks.state.isAdmin], [false, 'Agent Mairie', 'Responsable', false]);
  });

  test('keeps the loading placeholder and reports an unavailable profile', async () => {
    messageBff.on('get', '/me', { status: 503, raw: '', outOfContract: true });

    const { hooks } = renderHook();

    await waitFor(() => hooks.updates > 0);
    assert.deepEqual([hooks.state.loading, hooks.state.error, hooks.state.user.name], [false, 'Les informations du profil sont indisponibles.', 'Chargement…']);
  });

  test('returns to configured Login without logout when BFF Message rejects the session', async () => {
    messageBff.on('get', '/me', { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée'), outOfContract: true });

    const { hooks } = renderHook();

    await waitFor(() => browser.window.location.assigned.length === 1);
    assert.equal(hooks.updates, 0);
    assert.deepEqual(network.browserCalls, [{ method: 'GET', path: '/me' }, { method: 'POST', path: '/api/auth/refresh' }]);
    assert.equal(browser.window.location.reloads, 0);
    assert.equal(new URL(browser.window.location.assigned[0]).searchParams.get('redirect'), browser.window.location.href);
    assert.deepEqual(upstream(), ['GET /me'], 'la déconnexion ne sollicite aucun BFF');
  });

  test('a load that resolves after unmount leaves the state untouched', async () => {
    messageBff.on('get', '/me', { body: currentUser() });

    const { hooks } = renderHook();
    hooks.cleanups.forEach((cleanup) => cleanup());

    await waitFor(() => messageBff.requests.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(hooks.updates, 0);
  });
});

describe('explicit shared logout', () => {
  test('a logout without JSON content is refused without a network call or cookie expiry', async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    assert.equal(response.status, 415);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(network.cookies.accessToken, agentToken);
    assert.deepEqual(network.serverCalls, []);
  });

  test('logout transport failure remains visible and never reloads', async () => {
    const saved = global.fetch;
    global.fetch = async () => { throw new TypeError('fetch failed'); };
    try { await assert.rejects(logoutAndReload(), /La déconnexion n’a pas abouti/); }
    finally { global.fetch = saved; }
    assert.equal(browser.window.location.reloads, 0);
    assert.deepEqual(browser.window.location.assigned, []);
  });
});

describe('session role normalisation', () => {
  test('roles accept FR/EN aliases, prefixes and accents, and default to Guest', () => {
    assert.equal(normalizeAppRole(' ROLE_Administrateur '), 'Admin');
    assert.equal(normalizeAppRole('Invité'), 'Guest');
    assert.equal(normalizeAppRole('mayor'), 'Maire');
    assert.equal(normalizeAppRole('utilisateur'), 'User');
    assert.equal(normalizeAppRole('inconnu'), 'Guest');
    assert.equal(normalizeAppRole(undefined), 'Guest');
  });

  test('a blank name falls back to the email', () => {
    const session = toAuthSession({ id: 2, name: '  ', email: 'contact@mairie360.fr' });
    assert.deepEqual([session.user.name, session.role, session.user.phone], ['contact@mairie360.fr', 'Guest', undefined]);
    assert.equal(toAuthSession({ id: 3, name: '' }).user.name, '');
  });
});
