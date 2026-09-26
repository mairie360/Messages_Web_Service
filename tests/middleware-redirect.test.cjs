const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');

const { middleware } = requireSrc('middleware.ts');
const previous = {
  LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL,
  MESSAGE_FRONT_URL: process.env.MESSAGE_FRONT_URL,
};

test('missing or invalid Login configuration returns an uncached unavailable state', async () => {
  for (const value of [undefined, '', '  ', 'not a URL', 'ftp://login.mairie.test/', 'https://user:password@login.mairie.test/']) {
    if (value === undefined) delete process.env.LOGIN_FRONT_URL;
    else process.env.LOGIN_FRONT_URL = value;
    const response = middleware(new NextRequest('http://internal:3000/'));
    assert.equal(response.status, 503, String(value));
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.match(response.headers.get('set-cookie'), /accessToken=;/);
    assert.match(await response.text(), /Connexion temporairement indisponible/);
  }
});

test('an explicitly configured local destination is accepted without a hard-coded fallback', () => {
  process.env.LOGIN_FRONT_URL = '  http://localhost:5010/login  ';
  const response = middleware(new NextRequest('http://internal:3000/'));
  assert.equal(response.status, 307);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, 'http://localhost:5010');
  assert.equal(target.pathname, '/login');
});


afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('an unauthenticated visit returns to the public Messages URL, not the ingress host', () => {
  process.env.LOGIN_FRONT_URL = 'https://login.mairie.test/';
  process.env.MESSAGE_FRONT_URL = 'https://messages.mairie.test/';

  const response = middleware(new NextRequest('http://internal:3000/conversations/42?tab=unread'));
  const login = new URL(response.headers.get('location'));

  assert.equal(response.status, 307);
  assert.equal(login.origin, 'https://login.mairie.test');
  assert.equal(login.searchParams.get('redirect'), 'https://messages.mairie.test/conversations/42?tab=unread');
  assert.doesNotMatch(login.href, /internal:3000/);
});
