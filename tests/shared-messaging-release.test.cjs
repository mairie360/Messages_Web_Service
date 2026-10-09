const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('npm release-age exception is limited to the internal UI package', () => {
  const config = read('.npmrc');
  assert.match(config, /^min-release-age\s*=\s*7\s*$/m);
  const exclusions = [...config.matchAll(/^\s*min-release-age-exclude(\[\])?\s*=\s*(.+?)\s*$/gm)];
  assert.deepEqual(exclusions.map(([, list, name]) => [list, name]), [
    ['[]', '@mairie360/lib-components'],
  ]);
  assert.doesNotMatch(config, /^\s*before\b/m);
});
