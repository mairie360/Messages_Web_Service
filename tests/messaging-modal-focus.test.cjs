const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { manageMessagingModalFocus } = requireSrc('app/_components/messaging-modal-focus.ts');

// DOM doubles cover the controller; native desktop/mobile QA covers the published React dialogs.
function surface() {
  let notify;
  const listeners = new Map();
  const doc = { activeElement: null, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) };
  class Element {
    constructor(parent = null) { this.parent = parent; this.ownerDocument = doc; this.isConnected = true; this.tabIndex = 0; this.attributes = new Map(); this.items = []; }
    contains(node) { for (; node; node = node.parent) if (node === this) return true; return false; }
    focus() { doc.activeElement = this; listeners.get('focusin')?.(); }
    matches() { return Boolean(this.disabled); }
    closest() { return this.hidden ? this : null; }
    getClientRects() { return this.noRect ? [] : [{}]; }
    getAttribute(k) { return this.attributes.get(k) ?? null; }
    setAttribute(k, v) { this.attributes.set(k, v); }
    removeAttribute(k) { this.attributes.delete(k); }
    querySelectorAll() { return this.items; }
    querySelector(selector) { return selector.startsWith('button') ? this.close ?? null : selector.includes('region') ? this.fallback ?? null : this.modal ?? null; }
    click() { this.clicked = (this.clicked ?? 0) + 1; }
    addEventListener(k, f) { this[k] = f; }
    removeEventListener(k) { delete this[k]; }
  }
  class Observer { constructor(f) { notify = f; } observe() {} disconnect() { notify = null; } }
  doc.defaultView = { HTMLElement: Element, MutationObserver: Observer, getComputedStyle: e => ({display: e.display ?? 'block', visibility: e.visibility ?? 'visible'}) };
  doc.body = new Element();
  const opener = new Element(doc.body), outside = new Element(doc.body);
  const container = new Element(doc.body), modal = new Element(container), fallback = new Element(container);
  const first = new Element(modal), middle = new Element(modal), last = new Element(modal);
  modal.items = [first, middle, last]; modal.close = first; container.fallback = fallback;
  doc.activeElement = opener;
  const key = (key = 'Tab', shiftKey = false, extra = {}) => {
    const event = {key, shiftKey, prevented: false, preventDefault() { this.prevented = true; }, ...extra};
    container.keydown?.(event); return event;
  };
  return {doc, opener, outside, container, modal, fallback, first, middle, last, key, listeners, notify: () => notify?.(), Element};
}

test('observation starts without stealing background focus and opens the dialog on a real control', () => {
  const s = surface(); const stop = manageMessagingModalFocus(s.container);
  assert.equal(s.doc.activeElement, s.opener); assert.equal(s.key().prevented, false);
  s.container.modal = s.modal; s.notify(); assert.equal(s.doc.activeElement, s.first);
  assert.equal(s.modal.tabIndex, -1); stop(); assert.equal(s.doc.activeElement, s.opener);
  assert.equal(s.listeners.size, 0); assert.equal(s.container.keydown, undefined);
});

test('Tab and Shift+Tab wrap boundaries while normal interior typing and Tab are untouched', () => {
  const s = surface(); s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  assert.equal(s.key('Tab', true).prevented, true); assert.equal(s.doc.activeElement, s.last);
  assert.equal(s.key().prevented, true); assert.equal(s.doc.activeElement, s.first);
  s.middle.focus(); assert.equal(s.key().prevented, false); assert.equal(s.key('a').prevented, false);
  s.doc.activeElement = s.opener; s.key('Tab', true); assert.equal(s.doc.activeElement, s.last); stop();
});

test('disabled, hidden, negative tabindex and unrendered controls are skipped', () => {
  const s = surface(); s.first.disabled = true; s.middle.hidden = true; s.last.noRect = true;
  s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  assert.equal(s.doc.activeElement, s.modal); assert.equal(s.key().prevented, true);
  s.last.noRect = false; s.last.tabIndex = -1; s.notify(); s.key(); assert.equal(s.doc.activeElement, s.modal);
  s.last.tabIndex = 0; s.key(); assert.equal(s.doc.activeElement, s.last); stop();
});

test('background focus is contained and disabling a focused control keeps focus in the dialog', () => {
  const s = surface(); s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  s.outside.focus(); assert.equal(s.doc.activeElement, s.first);
  s.first.disabled = s.middle.disabled = s.last.disabled = true; s.notify(); assert.equal(s.doc.activeElement, s.modal);
  s.first.disabled = false; s.key(); assert.equal(s.doc.activeElement, s.first); stop();
});

test('Escape uses the published close callback but does not dismiss pending or handled keys', () => {
  const s = surface(); s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  assert.equal(s.key('Escape').prevented, true); assert.equal(s.first.clicked, 1);
  s.first.disabled = true; assert.equal(s.key('Escape').prevented, false); assert.equal(s.first.clicked, 1);
  s.first.disabled = false; s.key('Escape', false, {isComposing:true}); s.key('Escape', false, {defaultPrevented:true});
  assert.equal(s.first.clicked, 1); s.modal.close = null; assert.equal(s.key('Escape').prevented, false); stop();
});

test('close restores the opener and reopening captures a different trigger', () => {
  const s = surface(); const stop = manageMessagingModalFocus(s.container);
  s.modal.setAttribute('tabindex', '0'); s.container.modal = s.modal; s.notify();
  s.container.modal = null; s.doc.activeElement = s.doc.body; s.notify(); assert.equal(s.doc.activeElement, s.opener);
  assert.equal(s.modal.getAttribute('tabindex'), '0'); s.outside.focus();
  s.container.modal = s.modal; s.notify(); stop(); assert.equal(s.doc.activeElement, s.outside);
});

test('dialog replacement retains the original opener and prepares new controls', () => {
  const s = surface(); s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  const next = new s.Element(s.container), field = new s.Element(next); next.items = [field];
  s.container.modal = next; s.doc.activeElement = s.doc.body; s.notify(); assert.equal(s.doc.activeElement, field);
  stop(); assert.equal(s.doc.activeElement, s.opener); assert.equal(next.getAttribute('tabindex'), null);
});

test('removed opener falls back to the visible conversations region without stealing external navigation', () => {
  const s = surface(); s.container.modal = s.modal; const stop = manageMessagingModalFocus(s.container);
  s.opener.isConnected = false; s.container.modal = null; s.doc.activeElement = s.doc.body; s.notify();
  assert.equal(s.doc.activeElement, s.fallback); stop();
  s.doc.activeElement = s.outside; s.container.modal = s.modal; const second = manageMessagingModalFocus(s.container);
  s.doc.activeElement = s.opener; second(); assert.equal(s.doc.activeElement, s.opener);
});

test('no available fallback and hidden CSS controls do not acquire focus', () => {
  const s = surface(); s.container.modal = s.modal; s.first.visibility = 'hidden'; s.middle.display = 'none';
  const stop = manageMessagingModalFocus(s.container); assert.equal(s.doc.activeElement, s.last);
  s.opener.isConnected = false; s.container.fallback = null; s.doc.activeElement = s.doc.body; stop();
  assert.equal(s.doc.activeElement, s.doc.body);
});

test('server-like documents without a window do not acquire listeners', () => {
  const stop = manageMessagingModalFocus({ownerDocument:{defaultView:null}}); assert.equal(typeof stop, 'function'); stop();
});
