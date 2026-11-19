const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

const stylesheet = readFileSync(join(__dirname, '../src/app/app-shell.css'), 'utf8');
const selector = (value) => value.replace(/\s*>\s*/g, ' > ').replace(/\s+/g, ' ').trim();
const compact = (value) => value.replace(/\s+/g, '');

function policyDocument(t) {
  const errors = [], console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { virtualConsole: console });
  t.after(() => dom.window.close());
  const sharedStyle = dom.window.document.createElement('style');
  sharedStyle.textContent = require('./support/shared-theme-css.cjs').sharedThemeCss();
  dom.window.document.head.append(sharedStyle);
  const style = dom.window.document.createElement('style'); style.textContent = stylesheet;
  dom.window.document.head.append(style); assert.deepEqual(errors, [], 'Actual stylesheet must parse');
  const rows = [];
  function visit(rules, condition = null) {
    for (const rule of rules) {
      if (rule.cssRules) visit(rule.cssRules, rule.conditionText || condition);
      if (rule.style) rows.push({ selectors: rule.selectorText.split(',').map(selector),
        condition: condition ? compact(condition) : null, style: rule.style });
    }
  }
  visit(style.sheet.cssRules);
  const values = (selected, property, condition = null) => rows.filter((row) =>
    row.selectors.includes(selector(selected)) && row.condition === (condition ? compact(condition) : null))
    .map((row) => row.style.getPropertyValue(property)).filter(Boolean);
  const last = (selected, property, condition = null) => {
    const declarations = values(selected, property, condition);
    assert.ok(declarations.length, 'Keep scoped policy: ' + selected + ' / ' + property);
    return declarations.at(-1);
  };
  const color = (value) => {
    const probe = dom.window.document.createElement('span'); probe.style.color = value.replace(/var\((--[\w-]+)\)/g, (_match, name) => dom.window.getComputedStyle(dom.window.document.documentElement).getPropertyValue(name).trim());
    dom.window.document.body.append(probe);
    try { return dom.window.getComputedStyle(probe).color; } finally { probe.remove(); }
  };
  return { rows, values, last, color };
}

test('parsed messaging breakpoint policies retain reference desktop tracks and separate narrow panes', (t) => {
  const { values, last } = policyDocument(t), module = '.messages-module-frame > .messages-module';
  assert.deepEqual(values(module, 'grid-template-columns'), [], 'Only the desktop policy supplies two tracks');
  assert.equal(compact(last(module, 'grid-template-columns', '(min-width: 1024px)')), '300pxminmax(0,1fr)');
  const narrow = '(max-width: 1023px)';
  assert.equal(last('.messages-pane-switch', 'display', narrow), 'inline-flex');
  assert.equal(last('.messages-module > aside', 'display', narrow), 'none');
  assert.equal(last('.messages-list-open .messages-module > aside', 'display', narrow), 'flex');
  assert.equal(last('.messages-list-open .messages-module > div:nth-child(2)', 'display', narrow), 'none');
  // Configuration association only: JSDOM does not compile Tailwind or evaluate media queries.
});

test('parsed messaging fallback, small-text and focus policies preserve the shared header rhythm', (t) => {
  const { rows, last, color } = policyDocument(t);
  for (const row of rows) {
    assert.ok(row.selectors.every((selected) => !/(?:^|\s|>)\.text-(?:xs|sm)(?:$|:|\s|\[)/.test(selected)), 'Keep shared small-text classes');
    for (let index = 0; index < row.style.length; index += 1) {
      const property = row.style.item(index);
      assert.ok(!['--text-xs', '--text-sm'].includes(property), 'Keep shared small-text tokens');
    }
  }
  const outline = (target, condition = null) => {
    const tokens = last(target, 'outline', condition).trim().split(/\s+(?![^()]*\))/);
    const lengths = tokens.filter((token) => Number.isFinite(Number.parseFloat(token)));
    const colors = tokens.filter((token) => token !== 'solid' && !Number.isFinite(Number.parseFloat(token)));
    assert.deepEqual(lengths, ['2px']); assert.ok(tokens.includes('solid')); assert.equal(colors.length, 1);
    assert.equal(color(colors[0]), 'rgb(45, 120, 108)');
  };
  outline('.messages-module [role="region"]:focus-visible');
  outline('.messages-pane-switch:focus-visible', '(max-width: 1023px)');
  assert.equal(last('.messages-operation-status', 'flex-shrink'), '0');
  // Preserve configuration; native keyboard/scrolling and RGAA certification remain separate.
});

test('MAIR-838 app-shell.css keeps only the module geometry and never targets the lib frame', (t) => {
  const { rows } = policyDocument(t);
  const frame = /(?:^|[\s>+~,(])(?:html|body|main|header|footer|nav|aside\[aria-label|\[aria-label="Navigation)|\.messages-app-root|\.app-[\w-]+|\[data-m360-component|\[data-layout/;
  for (const row of rows) {
    for (const selected of row.selectors) {
      assert.doesNotMatch(selected, frame, `${selected} targets the lib frame`);
      assert.match(selected, /^\.messages-/, `${selected} must be scoped to the messaging module`);
    }
    for (let index = 0; index < row.style.length; index += 1) {
      assert.ok(!['font-family', 'font-size'].includes(row.style.item(index)) || !row.selectors.some((selected) => /^\.messages-(main-inner|module-stack|module-frame)$/.test(selected)),
        'Typography and scale come from the lib');
    }
  }
  assert.doesNotMatch(stylesheet, /font-size:\s*17px|system-ui/);
});
