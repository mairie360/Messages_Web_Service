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

test('default typography matches the reference without overriding shared text tokens or header height', () => {
  assert.match(rule('html'), /font-size: 17px;/);
  assert.match(rule('html body'), /font-family: system-ui, sans-serif;/);
  assert.doesNotMatch(css, /--text-(?:xs|sm)\s*:|\.text-(?:xs|sm)\s*\{/);
  const headerRule = css.match(/\.messages-app-root > \.flex > \.flex > header,[\s\S]*?\{([^}]+)\}/);
  assert.ok(headerRule, 'the shared header retains its shrink protection');
  assert.doesNotMatch(headerRule[1], /(?:min-|max-)?height:/);
});

test('the messaging shell stays bounded to the dynamic viewport', () => {
  assert.match(rule('.messages-app-root'), /height: 100dvh;[\s\S]*min-height: 0;[\s\S]*overflow: hidden;/);
  assert.match(rule('.messages-app-root > .flex'), /height: 100%;[\s\S]*min-height: 0;/);
  assert.match(rule('.messages-app-root > .flex > .flex'), /min-height: 0;/);
  assert.match(rule('.messages-app-root > .flex > .flex > main'), /display: flex;[\s\S]*min-height: 0;[\s\S]*overflow: hidden;/);
});

test('the messaging panel fills the reference space and retains its card shadow', () => {
  assert.match(rule('.messages-app-root > .flex > .flex > main'), /padding: 20px;/);
  assert.match(rule('.messages-main-inner'), /width: 100%;[\s\S]*max-width: none;/);
  assert.doesNotMatch(css, /max-width: 1534px;|padding: 32px 24px;/);
  assert.match(rule('.messages-module-frame > .messages-module'), /box-shadow: 0 5px 15px rgb\(23 32 51 \/ 14%\), 0 1px 3px rgb\(23 32 51 \/ 12%\);/);
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

test('narrow screens show one full-height pane at a time and desktop shows both', () => {
  assert.match(rule('.messages-module-frame > .messages-module'), /grid-template-rows: minmax\(0, 1fr\);/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.messages-pane-switch \{\s*display: inline-flex;/);
  assert.match(css, /\.messages-list-open \.messages-module > aside \{\s*display: flex;/);
  assert.match(css, /\.messages-list-open \.messages-module > div:nth-child\(2\) \{\s*display: none;/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.messages-app-root > \.flex > \.flex > main \{\s*padding: 10px;/);
});
