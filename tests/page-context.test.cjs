const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/page-context-loader.cjs');
const { readPageUrlState, pageStateUrl, urlChoice, urlText, urlPage, urlDate } = requireSrc('lib/page-url-state.ts');
const { readSidebarPreference, sidebarPreferenceCookie, validSidebarCookieDomain, configureSidebarCookieDomain } = requireSrc('lib/sidebar-preference.ts');

test('page context rejects duplicate, unknown, oversized and invalid parameters', () => {
  const schema = { tab: urlChoice(['profile', 'security']), q: urlText(12), page: urlPage, date: urlDate };
  assert.deepEqual(readPageUrlState('?tab=security&q=mairie&page=2&date=2028-02-29', schema), { tab:'security', q:'mairie', page:'2', date:'2028-02-29' });
  assert.deepEqual(readPageUrlState('?tab=security&tab=profile&q=too-long-search&page=0&date=2026-02-29', schema), { tab:'profile', q:'', page:'1', date:'' });
  assert.equal(readPageUrlState('?tab=unknown&q=%00', schema).q, '');
  assert.equal(urlDate.accept('not-a-date'), false);
  assert.equal(urlDate.accept('9999-99-99'), false);
});

test('changing page context preserves a deep link, fragment and unrelated query', () => {
  const schema = { tab: urlChoice(['profile', 'security']), q: urlText() };
  assert.equal(pageStateUrl('https://settings.example.test/?event=12&tab=profile#detail', { tab:'security', q:'a & b', ignored:'value' }, schema), '/?event=12&tab=security&q=a+%26+b#detail');
  assert.equal(pageStateUrl('https://settings.example.test/?event=12&tab=security', { tab:'profile', q:'\u0000' }, schema), '/?event=12');
});

test('only the versioned sidebar preference is read and auth cookies are untouched', () => {
  assert.equal(readSidebarPreference('refreshToken=private; mairie360_sidebar=v1:collapsed'), true);
  for (const cookie of ['', 'mairie360_sidebar=collapsed', 'mairie360_sidebar=v1:expanded', 'other_mairie360_sidebar=v1:collapsed']) assert.equal(readSidebarPreference(cookie), false);
  configureSidebarCookieDomain('.dev.example.test');
  assert.equal(sidebarPreferenceCookie(true, 'settings.dev.example.test', 'https:'), 'mairie360_sidebar=v1:collapsed; Path=/; Max-Age=31536000; SameSite=Lax; Domain=dev.example.test; Secure');
  assert.equal(sidebarPreferenceCookie(false, 'localhost', 'http:'), 'mairie360_sidebar=v1:expanded; Path=/; Max-Age=31536000; SameSite=Lax');
  configureSidebarCookieDomain(undefined);
});

test('sidebar cookies reject unrelated domains, injection, IPs and deceptive suffixes', () => {
  assert.equal(validSidebarCookieDomain(' example.test ', 'example.test'), 'example.test');
  assert.equal(validSidebarCookieDomain('.example.test', 'projects.example.test'), 'example.test');
  for (const domain of [undefined, 'localhost', '127.0.0.1', 'example.test; Secure', 'https://example.test', 'evil.test', 'example.test:443']) assert.equal(validSidebarCookieDomain(domain, 'projects.example.test'), undefined);
  assert.equal(validSidebarCookieDomain('example.test', 'notexample.test'), undefined);
});


test('foreground events coalesce, hidden pages stay quiet and cleanup cancels callbacks', async () => {
  const originalWindow = global.window, originalDocument = global.document;
  const handlers = new Map();
  const target = prefix => ({ addEventListener: (name, handler) => handlers.set(prefix + name, handler), removeEventListener: name => handlers.delete(prefix + name) });
  global.window = target('window:'); global.document = { ...target('document:'), hidden: false };
  try {
    const { subscribePageReturn } = requireSrc('lib/page-return.ts');
    let reads = 0;
    const close = subscribePageReturn(() => reads++);
    handlers.get('window:focus')(); handlers.get('document:visibilitychange')();
    await Promise.resolve(); assert.equal(reads, 1);
    global.document.hidden = true; handlers.get('window:focus')(); await Promise.resolve(); assert.equal(reads, 1);
    global.document.hidden = false; handlers.get('window:focus')(); close(); await Promise.resolve();
    assert.equal(reads, 1); assert.equal(handlers.size, 0);
  } finally { if (originalWindow === undefined) delete global.window; else global.window = originalWindow; if (originalDocument === undefined) delete global.document; else global.document = originalDocument; }
});
