// Globaux navigateur minimaux (window.location) pour les modules client chargés sous Node.

function installBrowser() {
  const browser = { location: { reloads: 0, reload() { this.reloads += 1; } } };
  global.window = browser;
  return {
    window: browser,
    reset() { browser.location.reloads = 0; },
    restore() { delete global.window; },
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
