const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Messages pins the published shared UI package', () => {
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const dependency = 'node_modules/@mairie360/lib-components';

  assert.equal(manifest.dependencies['@mairie360/lib-components'], '0.6.4');
  assert.equal(lock.packages[''].dependencies['@mairie360/lib-components'], '0.6.4');
  assert.equal(lock.packages[dependency].version, '0.6.4');
  assert.match(lock.packages[dependency].resolved, /^https:\/\/npm\.pkg\.github\.com\/download\/@mairie360\/lib-components\/0\.6\.4\//);
  assert.match(lock.packages[dependency].integrity, /^sha512-/);
});

test('npm release-age exception is limited to the internal UI package', () => {
  const config = read('.npmrc');
  assert.match(config, /^min-release-age\s*=\s*7\s*$/m);
  const exclusions = [...config.matchAll(/^\s*min-release-age-exclude(\[\])?\s*=\s*(.+?)\s*$/gm)];
  assert.deepEqual(exclusions.map(([, list, name]) => [list, name]), [
    ['[]', '@mairie360/lib-components'],
  ]);
  assert.doesNotMatch(config, /^\s*before\b/m);
});
