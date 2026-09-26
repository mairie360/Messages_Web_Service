const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const savedLoginUrl = process.env.LOGIN_FRONT_URL;
beforeEach(() => { process.env.LOGIN_FRONT_URL = 'https://login.mairie.test/'; });
afterEach(() => {
  if (savedLoginUrl === undefined) delete process.env.LOGIN_FRONT_URL;
  else process.env.LOGIN_FRONT_URL = savedLoginUrl;
});
const { NextRequest } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');
const { middleware } = requireSrc('middleware.ts');
const { buildContentSecurityPolicy } = requireSrc('lib/content-security-policy.ts');
const nextConfig = requireSrc('../next.config.ts').default;

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (exp) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: '2', exp })}.signature`;
const pageRequest = (token) => new NextRequest('http://localhost:5003/', token ? { headers: { cookie: `accessToken=${token}` } } : {});

test('authenticated pages get a per-request nonce CSP forwarded to Next.js', () => {
  const token = jwt(Math.floor(Date.now() / 1000) + 3600);
  const first = middleware(pageRequest(token));
  const second = middleware(pageRequest(token));
  const csp = first.headers.get('content-security-policy');
  const nonce = first.headers.get('x-middleware-request-x-nonce');
  assert.ok(nonce);
  assert.match(csp, new RegExp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`));
  assert.match(csp, new RegExp(`style-src 'self' 'nonce-${nonce}';`));
  assert.match(csp, /style-src-attr 'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(first.headers.get('x-middleware-request-content-security-policy'), csp);
  assert.notEqual(second.headers.get('x-middleware-request-x-nonce'), nonce);
});

test('missing or expired sessions are redirected to Login without a CSP', () => {
  for (const token of [undefined, jwt(1)]) {
    const response = middleware(pageRequest(token));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('content-security-policy'), null);
    assert.match(response.headers.get('set-cookie'), /accessToken=;/);
  }
});

test('development CSP allows eval for hot reload only', () => {
  assert.doesNotMatch(buildContentSecurityPolicy('n'), /unsafe-eval/);
  assert.match(buildContentSecurityPolicy('n', true), /script-src [^;]*'unsafe-eval'/);
});

test('static security headers apply to every route and X-Powered-By is disabled', async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const [rule] = await nextConfig.headers();
  assert.equal(rule.source, '/:path*');
  assert.deepEqual(rule.headers.map(({ key }) => key).sort(), ['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options']);
});
