const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadRootLayout } = require('./support/root-layout.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath));

test('browser and app icons use the same Mairie360 mark', () => {
  const logo = read('public/mairie360-logo.png');
  const appleIcon = read('src/app/apple-icon.png');
  const faviconPng = read('public/mairie360-favicon.png');
  const appIcon = read('src/app/icon.png');
  const faviconIco = read('src/app/favicon.ico');

  assert.deepEqual(logo, appleIcon);
  assert.deepEqual(faviconPng, appIcon);
  assert.deepEqual(faviconIco.subarray(22), faviconPng);
  assert.equal(logo.readUInt32BE(16), 192);
  assert.equal(logo.readUInt32BE(20), 192);
  assert.equal(existsSync(path.join(root, 'src/app/icon0.svg')), false);
  assert.equal(existsSync(path.join(root, 'src/app/icon1.png')), false);
});

test('manifest and page metadata expose the branded assets', async () => {
  const manifest = JSON.parse(read('src/app/manifest.json').toString('utf8'));
  const { metadata, default: RootLayout } = loadRootLayout(() => require('./support/load-ts.cjs').requireSrc('app/layout.tsx'));
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');

  assert.equal(manifest.icons.length, 1);
  assert.match(manifest.icons[0].src, /^\/mairie360-logo\.png\?v=/);
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.equal(metadata.title, "Messagerie | Mairie360");
  assert.equal(metadata.description, "Module de messagerie Mairie360.");
  const icon = metadata.icons.icon.find(item => new URL(item.url, 'https://frontend.test').pathname === '/mairie360-favicon.png');
  assert.ok(icon, 'metadata contains the public browser icon');
  assert.ok(new URL(icon.url, 'https://frontend.test').searchParams.get('v'), 'the icon keeps its cache key');
  const html = renderToStaticMarkup(await RootLayout({children:React.createElement('span', { id: 'branding-child' }, 'Preserved child')}));
  assert.match(html, /<span id="branding-child">Preserved child<\/span>/);
});

test('MAIR-844 the shared navigation renders the lib logo and the commune name; MAIR-1156 no footer', async () => {
  const saved = { COMMUNE_NAME: process.env.COMMUNE_NAME, APP_VERSION: process.env.APP_VERSION, LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL };
  Object.assign(process.env, { COMMUNE_NAME: 'Villeneuve', APP_VERSION: '3.2.1', LOGIN_FRONT_URL: 'https://login.example/' });
  try {
    const { layout, AppShell } = loadRootLayout(() => ({
      layout: require('./support/load-ts.cjs').requireSrc('app/layout.tsx'),
      AppShell: require('./support/load-ts.cjs').requireSrc('components/MessagesPage/components/MessagesWorkspace/components/AppShell/AppShell.tsx').AppShell,
    }));
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { mairie360LogoSrc } = require('@mairie360/lib-components/shell');
    const shell = React.createElement(AppShell, { activeItem: 'messages' }, 'Page content');
    const html = renderToStaticMarkup(await layout.default({children:shell}));
    const band = html.match(/<aside\b[^>]*class="app-desktop-navigation"[\s\S]*?<\/aside>/)?.[0] ?? '';
    const logo = band.match(/<img\b[^>]*class="app-navigation-logo"[^>]*>/)?.[0] ?? '';
    assert.ok(logo.includes(`src="${mairie360LogoSrc}"`), 'the band shows the lib logo');
    assert.doesNotMatch(band, /mairie360-logo\.png/);
    assert.match(band, /Commune de<\/span><span class="app-navigation-commune-name">Villeneuve<\/span>/);
    // MAIR-1156: the page base has no footer, so neither the version nor the legal links are rendered.
    assert.doesNotMatch(html, /<footer\b|Version 3\.2\.1|mentions-legales/);
  } finally {
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
