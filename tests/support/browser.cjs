// Globaux navigateur minimaux (window.location) pour les modules client chargés sous Node.

function installBrowser() {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const intervals = new Map();
  let nextIntervalId = 1;
  const add = (listeners, name, callback) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(callback);
  };
  const remove = (listeners, name, callback) => listeners.get(name)?.delete(callback);
  const emit = (listeners, name) => listeners.get(name)?.forEach((callback) => callback());
  const browser = {
    location: { reloads: 0, search: '', reload() { this.reloads += 1; } },
    setInterval(callback, delay) {
      const id = nextIntervalId++;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    addEventListener(name, callback) { add(windowListeners, name, callback); },
    removeEventListener(name, callback) { remove(windowListeners, name, callback); },
  };
  const document = {
    hidden: false,
    addEventListener(name, callback) { add(documentListeners, name, callback); },
    removeEventListener(name, callback) { remove(documentListeners, name, callback); },
  };
  global.window = browser;
  global.document = document;
  return {
    window: browser,
    document,
    focus() { emit(windowListeners, 'focus'); },
    tickIntervals(delay) {
      [...intervals.values()].filter((interval) => interval.delay === delay)
        .forEach((interval) => interval.callback());
    },
    setHidden(hidden) {
      document.hidden = hidden;
      emit(documentListeners, 'visibilitychange');
    },
    reset() { browser.location.reloads = 0; browser.location.search = ''; document.hidden = false; intervals.clear(); },
    restore() { delete global.window; delete global.document; },
  };
}

/**
 * Exécute `useState` / `useEffect` de React hors rendu : l'état est gardé dans une cellule et l'effet est
 * lancé immédiatement. Les modules transpilés appellent `react_1.useState(...)` à l'exécution, remplacer
 * les fonctions exportées suffit.
 */
function withFakeHooks(React, run) {
  const { useState, useEffect } = React;
  const hooks = { state: undefined, updates: 0, cleanups: [] };
  React.useState = (initial) => {
    hooks.state = typeof initial === 'function' ? initial() : initial;
    return [hooks.state, (next) => {
      hooks.state = typeof next === 'function' ? next(hooks.state) : next;
      hooks.updates += 1;
    }];
  };
  React.useEffect = (effect) => {
    const cleanup = effect();
    if (typeof cleanup === 'function') hooks.cleanups.push(cleanup);
  };
  try {
    return run(hooks);
  } finally {
    React.useState = useState;
    React.useEffect = useEffect;
  }
}

/** Attend qu'une condition asynchrone devienne vraie (effets React lancés sans rendu). */
async function waitFor(predicate, timeoutMs = 2000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('Condition non atteinte avant expiration');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

module.exports = { installBrowser, waitFor, withFakeHooks };
