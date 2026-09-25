const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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

test('manifest and page metadata expose the branded assets', () => {
  const manifest = JSON.parse(read('src/app/manifest.json').toString('utf8'));
  const layout = read('src/app/layout.tsx').toString('utf8');

  assert.equal(manifest.icons.length, 1);
  assert.match(manifest.icons[0].src, /^\/mairie360-logo\.png\?v=/);
  assert.equal(manifest.icons[0].purpose, 'any');
  assert.match(layout, /title: "Messagerie \| Mairie360"/);
  assert.match(layout, /description: "Module de messagerie Mairie360\."/);
  assert.match(layout, /\/mairie360-favicon\.png\?v=/);
});
