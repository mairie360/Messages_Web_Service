const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');

const { middleware } = requireSrc('middleware.ts');
const previous = {
  LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL,
  MESSAGE_FRONT_URL: process.env.MESSAGE_FRONT_URL,
};

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
