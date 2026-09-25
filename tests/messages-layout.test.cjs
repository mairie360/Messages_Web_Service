const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { join } = require('node:path');

const css = readFileSync(join(__dirname, '../src/app/app-shell.css'), 'utf8');

function rule(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing ${selector} rule`);
  return css.slice(start, css.indexOf('}', start));
}

test('only the messaging page is bounded to the dynamic viewport', () => {
  assert.match(rule('.messages-app-root'), /min-height: 100vh;/);
  assert.doesNotMatch(rule('.messages-app-root'), /overflow: hidden;/);
  assert.match(rule('.messages-app-root--bounded'), /height: 100dvh;[\s\S]*overflow: hidden;/);
  assert.match(rule('.messages-app-root--bounded .messages-shell'), /height: 100%;[\s\S]*min-height: 0;/);
  assert.match(rule('.messages-app-root--bounded .messages-content'), /min-height: 0;/);
});

test('contacts and messages keep independent scroll areas while controls stay visible', () => {
  assert.match(rule('.messages-module-frame > .messages-module'), /min-height: 0;[\s\S]*height: 100%;/);
  assert.match(rule('.messages-module-frame'), /min-height: 0;[\s\S]*flex: 1;/);
  assert.match(rule('.messages-module-stack'), /min-height: 0;[\s\S]*flex: 1;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.messages-module > aside > div:last-child,[\s\S]*?overscroll-behavior: contain;/);
  assert.match(css, /\.messages-module > div:nth-child\(2\) > \.flex-1 \{\s*overflow-x: hidden;\s*overflow-y: auto;\s*overflow-wrap: anywhere;/);
  assert.match(rule('.messages-module > div:nth-child(2) > :not(.flex-1)'), /flex-shrink: 0;/);
  assert.match(rule('.messages-error'), /flex-shrink: 0;/);
  assert.match(rule('.messages-module [role="region"]:focus-visible'), /outline: 2px solid #1256a6;/);
});

test('narrow screens stack the panes and desktop keeps one grid row', () => {
  assert.match(rule('.messages-module-frame > .messages-module'), /grid-template-rows: minmax\(0, min\(13rem, 30dvh\)\) minmax\(0, 1fr\);/);
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*?\.messages-main \{\s*padding: 10px;/);
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*?\.messages-module-frame > \.messages-module \{\s*grid-template-rows: minmax\(0, 1fr\);/);
});
