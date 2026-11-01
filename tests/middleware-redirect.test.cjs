const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');

const { middleware } = requireSrc('middleware.ts');
const { GET: resume } = requireSrc('app/api/auth/resume/route.ts');
const ownKey = 'MESSAGE_FRONT_URL';
const previous = Object.fromEntries(['LOGIN_FRONT_URL', ownKey, 'SETTINGS_FRONT_URL'].map(key => [key, process.env[key]]));
const validCookie = 'accessToken=e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature';
afterEach(() => { for (const [key,value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value; });

test('invalid Login configuration fails at local resume without exposing an external destination', async () => {
  process.env[ownKey] = 'https://module.mairie.test/';
  for (const value of [undefined, '', 'not a URL', 'ftp://login.mairie.test/', 'https://user:secret@login.mairie.test/']) {
    value === undefined ? delete process.env.LOGIN_FRONT_URL : process.env.LOGIN_FRONT_URL = value;
    const guarded = middleware(new NextRequest('http://internal:3000/?view=retained'));
    assert.equal(guarded.status,307);
    const local = new URL(guarded.headers.get('location'));
    assert.equal(local.origin,'https://module.mairie.test');assert.equal(local.pathname,'/api/auth/resume');
    const result = await resume(new NextRequest(local));
    assert.equal(result.status,503);assert.equal(result.headers.get('location'),null);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'no-store');
  }
});
test('an explicitly configured local frontend uses its own resume route without a fallback hostname', () => {
  process.env[ownKey] = ' http://localhost:5010/tool ';process.env.LOGIN_FRONT_URL='https://login.mairie.test/';
  const result=middleware(new NextRequest('http://internal:3000/'));
  assert.equal(result.status,307);const target=new URL(result.headers.get('location'));
  assert.equal(target.origin,'http://localhost:5010');assert.equal(target.pathname,'/api/auth/resume');assert.equal(target.searchParams.get('next'),'/');
});
test('an unauthenticated document preserves the public page and query in local resume', () => {
  process.env[ownKey]='https://module.mairie.test/';process.env.LOGIN_FRONT_URL='https://login.mairie.test/';
  const result=middleware(new NextRequest('http://internal:3000/profile?view=retained'));
  assert.equal(result.status,307);const target=new URL(result.headers.get('location'));
  assert.equal(target.origin,'https://module.mairie.test');assert.equal(target.pathname,'/api/auth/resume');assert.equal(target.searchParams.get('next'),'/profile?view=retained');assert.doesNotMatch(target.href,/internal:3000/);
});
test('authenticated legacy profile bookmarks redirect to configured Settings', () => {
  process.env.SETTINGS_FRONT_URL = 'https://settings.mairie.test/account?tab=general';
  for (const path of ['/profile', '/profile/security?legacy=1']) {
    const response = middleware(new NextRequest(`http://internal:3000${path}`, {
      headers: { cookie: validCookie },
    }));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://settings.mairie.test/account?tab=general');
  }
});

test('invalid Settings destinations return an uncached unavailable state', async () => {
  for (const value of [undefined, 'javascript:alert(1)', 'https://user:pass@settings.mairie.test/', 'https://settings.mairie.test/profile']) {
    if (value === undefined) delete process.env.SETTINGS_FRONT_URL;
    else process.env.SETTINGS_FRONT_URL = value;
    const response = middleware(new NextRequest('http://internal:3000/profile', {
      headers: { cookie: validCookie },
    }));
    assert.equal(response.status, 503, String(value));
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /Paramètres indisponibles/);
  }
});



test('missing or expired access preserves the requested document without leaking the refresh token', () => {
  process.env[ownKey]='https://module.mairie.test/';process.env.LOGIN_FRONT_URL='https://login.mairie.test/';
  const expired='e30.'+Buffer.from(JSON.stringify({exp:1})).toString('base64url')+'.signature';
  for (const cookie of ['',`accessToken=${expired}`,'refreshToken=opaque-refresh']) {
    const result=middleware(new NextRequest('http://internal:3000/?filter=active&view=compact',{headers:{cookie}}));
    const target=new URL(result.headers.get('location'));assert.equal(result.status,307);assert.equal(target.origin,'https://module.mairie.test');assert.equal(target.pathname,'/api/auth/resume');assert.equal(target.searchParams.get('next'),'/?filter=active&view=compact');
    assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('set-cookie'),null);assert.doesNotMatch(target.href,/opaque-refresh|internal:3000/);
  }
});
test('missing public frontend configuration fails closed before building a resume destination', () => {
  delete process.env[ownKey];process.env.LOGIN_FRONT_URL='https://login.mairie.test/';
  const result=middleware(new NextRequest('http://internal:3000/'));assert.equal(result.status,503);assert.equal(result.headers.get('location'),null);assert.equal(result.headers.get('cache-control'),'no-store');
});
