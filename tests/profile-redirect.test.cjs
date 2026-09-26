const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { renderToStaticMarkup } = require('react-dom/server');
const { requireSrc } = require('./support/load-ts.cjs');
const load = (path) => requireSrc(path);

const { settingsProfileUrl } = load('lib/settings-profile.ts');
const { default: Page, dynamic } = load('app/profile/[[...path]]/page.tsx');
const savedSettings = process.env.SETTINGS_FRONT_URL;

afterEach(() => {
  if (savedSettings === undefined) delete process.env.SETTINGS_FRONT_URL;
  else process.env.SETTINGS_FRONT_URL = savedSettings;
});

test('the legacy account route resolves Settings at request time without fetching a profile', (t) => {
  const fetch = t.mock.method(global, 'fetch', () => { throw new Error('Unexpected profile request'); });
  assert.equal(dynamic, 'force-dynamic');
  for (const destination of ['https://settings.test.example/', 'https://other.test.example/account?tab=profile']) {
    process.env.SETTINGS_FRONT_URL = destination;
    assert.throws(() => Page(), (error) => error.digest === `NEXT_REDIRECT;replace;${destination};307;`);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('a configured base path is preserved and whitespace is trimmed', () => {
  assert.equal(settingsProfileUrl(' https://settings.test.example/account/ '), 'https://settings.test.example/account/');
});

for (const value of [
  undefined, '', '   ', 'not a URL', '/settings', '//settings.test.example/',
  'javascript:void(0)', 'ftp://settings.test.example/', 'https://user:secret@settings.test.example/',
  'https://settings.test.example/profile', 'https://settings.test.example/profile/security',
  'https://settings.test.example/%70rofile/', 'https://settings.test.example/%FF',
]) {
  test(`invalid or looping Settings destination renders an honest fallback: ${String(value)}`, (t) => {
    const fetch = t.mock.method(global, 'fetch', () => { throw new Error('Unexpected profile request'); });
    if (value === undefined) delete process.env.SETTINGS_FRONT_URL;
    else process.env.SETTINGS_FRONT_URL = value;
    assert.equal(settingsProfileUrl(value), undefined);
    const html = renderToStaticMarkup(Page());
    assert.match(html, /Paramètres indisponibles/);
    assert.match(html, /role="alert"/);
    assert.match(html, /href="\/"[^>]*>Revenir au module/);
    assert.doesNotMatch(html, /Admin Système|admin@mairie360|value="[^"]+@/);
    assert.equal(fetch.mock.callCount(), 0);
  });
}
