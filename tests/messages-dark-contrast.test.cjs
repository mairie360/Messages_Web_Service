const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { JSDOM } = require('jsdom');
const postcss = require('postcss');

const root = resolve(__dirname, '..');
const markup = `<body class="mairie-ui"><div class="messages-app-root"><main><section class="messages-module bg-white text-[#172033]">
<div role="status" aria-label="Notifications de messagerie" class="flex flex-wrap items-center gap-3 border-b border-[#d8d2ca] bg-[#fff8e8] px-4 py-2.5 text-sm text-[#5a3b00] sm:px-5"><span id="notification-label" class="font-semibold">2 notifications non lues</span><button id="notification-action" type="button" class="rounded-md px-2 py-1 font-semibold text-[#1256a6] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1256a6]/30">Voir Équipe communication</button></div>
<form class="border-t border-[#d8d2ca] bg-white px-4 py-4 text-[#172033] sm:px-5"><button id="attach" type="button" aria-label="Joindre un fichier" class="inline-flex size-8 items-center justify-center rounded-md text-[#2f3747] transition hover:bg-[#f5f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1256a6]/30"><svg id="attach-icon" class="size-4" stroke="currentColor" fill="none"><path d="M2 2h10v10H2z"></path></svg></button><button type="button" aria-label="Mentionner un utilisateur" class="inline-flex size-8 items-center justify-center rounded-md text-[#2f3747] transition hover:bg-[#f5f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1256a6]/30"><svg id="mention-icon" class="size-4" stroke="currentColor" fill="none"><path d="M2 2h10v10H2z"></path></svg></button><button type="button" aria-label="Réactions" class="inline-flex size-8 items-center justify-center rounded-md text-[#2f3747] transition hover:bg-[#f5f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1256a6]/30"><svg id="reaction-icon" class="size-4" stroke="currentColor" fill="none"><path d="M2 2h10v10H2z"></path></svg></button><button id="primary" class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1256a6] text-white">Envoyer</button><button id="white-override" class="bg-[#1256a6] text-[#2f3747] text-white">Action primaire</button></form><span id="timestamp" class="text-xs text-[#5f6770]">15/09 13:30</span></section></main></div><div role="dialog" aria-label="Nouveau message" class="bg-[#f5f3f0]"><label id="recipient" for="recipient-input" class="mb-1 block text-sm font-semibold leading-5 text-[#2f3747]">Destinataire</label><input id="recipient-input"><p id="description" class="text-sm text-[#5f6770]">Choisissez un destinataire.</p></div></body>`;

async function screen(theme) {
  const { compile } = await import('tailwindcss');
  const globals = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
  const dom = new JSDOM(`<html data-theme="${theme}"><head></head>${markup}</html>`);
  const classes = [...dom.window.document.querySelectorAll('[class]')].flatMap(element => [...element.classList]);
  const style = dom.window.document.createElement('style');
  const compiled = (await compile(globals, {
    base: root,
    loadStylesheet: async (id, base) => {
      const path = id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : id.startsWith('.') || id.startsWith('/') ? resolve(base, id) : require.resolve(id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
    loadModule: async id => ({ path: require.resolve(id), base: root, module: (await import(id)).default }),
  })).build(classes);
  // JSDOM does not apply layered utility priority reliably. Keep the compiler's
  // layer order while exposing the declarations to its CSS cascade.
  const parsed = postcss.parse(compiled);
  parsed.walkAtRules('layer', rule => rule.replaceWith(...(rule.nodes ?? [])));
  style.textContent = parsed.toString();
  dom.window.document.head.append(style);
  const computed = element => dom.window.getComputedStyle(element);
  // JSDOM drops shorthand backgrounds containing var(), unlike browsers.
  // Resolve only the actual active colour tokens before applying its cascade.
  for (const [prefix, element] of [['mairie', dom.window.document.documentElement]]) {
    const tokens = computed(element);
    style.textContent = style.textContent.replace(new RegExp(`var\\((--${prefix}-[\\w-]+)\\)`, 'g'), (match, name) => {
      const value = tokens.getPropertyValue(name).trim();
      return /^#[\da-f]{6}$/i.test(value) ? value : match;
    });
  }
  const variable = (element, name) => {
    for (let current = element; current; current = current.parentElement) {
      const value = computed(current).getPropertyValue(name).trim();
      if (value) return value;
    }
    return '';
  };
  const colour = (value, element) => {
    for (let pass = 0; pass < 10 && value.includes('var('); ++pass) value = value.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_match, name, fallback) => variable(element, name) || fallback || '');
    if (/^#[\da-f]{3}$/i.test(value)) value = '#' + [...value.slice(1)].map(char => char + char).join('');
    if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
    const rgb = /^rgb[a]?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(value);
    assert.ok(rgb, `Expected an applied solid colour, received ${value}`);
    return rgb.slice(1, 4).map(Number);
  };
  const background = element => {
    for (let current = element; current; current = current.parentElement) {
      const value = computed(current).backgroundColor;
      if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') return colour(value, current);
    }
    throw new Error('No rendered background');
  };
  const luminance = channels => channels.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return {
    dom,
    colour: id => colour(computed(dom.window.document.getElementById(id)).color, dom.window.document.getElementById(id)),
    background: id => background(dom.window.document.getElementById(id)),
    contrast(id) {
      const element = dom.window.document.getElementById(id);
      const pair = [luminance(colour(computed(element).color, element)), luminance(background(element))].sort((a, b) => b - a);
      return (pair[0] + 0.05) / (pair[1] + 0.05);
    },
  };
}

for (const [id, minimum] of [['notification-label', 4.5], ['notification-action', 4.5], ['attach-icon', 3], ['mention-icon', 3], ['reaction-icon', 3], ['recipient', 4.5], ['timestamp', 4.5], ['description', 4.5]]) {
  test(`dark rendered Messages ${id} has sufficient contrast on its opaque surface`, async context => {
    const view = await screen('dark');
    try {
      const ratio = view.contrast(id);
      context.diagnostic(`${id}: colour rgb(${view.colour(id)}) on rgb(${view.background(id)}), contrast ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= minimum, `${id} contrast ${ratio.toFixed(2)} must reach ${minimum}`);
    } finally { view.dom.window.close(); }
  });
}
test('the Messages foreground remap preserves the primary background, white text and enabled composer actions', async () => {
  const view = await screen('dark');
  try {
    assert.deepEqual(view.background('primary'), [18, 86, 166]);
    assert.deepEqual(view.colour('primary'), [255, 255, 255]);
    assert.deepEqual(view.colour('white-override'), [255, 255, 255]);
    for (const id of ['attach-icon', 'mention-icon', 'reaction-icon']) {
      const icon = view.dom.window.document.getElementById(id);
      assert.equal(icon.getAttribute('stroke'), 'currentColor');
      assert.equal(icon.closest('button').disabled, false);
    }
  } finally { view.dom.window.close(); }
});
test('light Messages keeps its warning, action and icon colours', async () => {
  const view = await screen('light');
  try {
    assert.deepEqual(view.background('notification-label'), [255, 248, 232]);
    assert.deepEqual(view.colour('notification-label'), [90, 59, 0]);
    assert.deepEqual(view.colour('notification-action'), [18, 86, 166]);
    assert.deepEqual(view.colour('attach-icon'), [47, 55, 71]);
    assert.deepEqual(view.colour('recipient'), [47, 55, 71]);
  } finally { view.dom.window.close(); }
});
