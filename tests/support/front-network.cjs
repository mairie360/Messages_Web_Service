const fs = require('node:fs');
const path = require('node:path');
const { NextRequest } = require('next/server');
const { SRC, requireSrc } = require('./load-ts.cjs');

// Réseau simulé du front, de bout en bout :
// - un `fetch` sur un chemin relatif (ou sur l'origine du front) est un appel du navigateur : il est routé
//   comme le ferait Next.js App Router vers le handler `route.ts` de src/app (route explicite prioritaire sur
//   un segment dynamique, lui-même prioritaire sur le catch-all `[...path]`), avec les cookies du navigateur ;
// - un `fetch` absolu est un appel serveur : il n'est autorisé que vers les mocks enregistrés (serveurs HTTP
//   pilotés par contrat), tout autre hôte est une violation et échoue comme une panne réseau.
// Aucun appel ne peut donc sortir du front sans passer par une route de src/app puis par un contrat.

const FRONT_ORIGIN = 'http://localhost:5003';
const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/** Table de routage des handlers `route.ts` de src/app, triée comme App Router. */
function appRoutes() {
  const appDir = path.join(SRC, 'app');
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      // Les dossiers privés `_nom` ne sont pas routables.
      if (entry.isDirectory() && !entry.name.startsWith('_')) walk(full);
      else if (entry.isFile() && /^route\.(ts|js)$/.test(entry.name)) files.push(full);
    }
  };
  walk(appDir);
  const rank = (segment) => (segment.startsWith('[...') ? 2 : segment.startsWith('[') ? 1 : 0);
  return files.map((file) => {
    // Les groupes `(nom)` n'apparaissent pas dans l'URL.
    const segments = path.relative(appDir, path.dirname(file)).split(path.sep).filter((segment) => segment && !/^\(.*\)$/.test(segment));
    return { file, segments, route: `/${segments.join('/')}`, weight: segments.map(rank) };
  }).sort((a, b) => {
    // Segment statique < dynamique < catch-all, position par position.
    for (let i = 0; i < Math.max(a.weight.length, b.weight.length); i += 1) {
      const diff = (a.weight[i] ?? -1) - (b.weight[i] ?? -1);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

function matchRoute(route, parts) {
  const params = {};
  for (let i = 0; i < route.segments.length; i += 1) {
    const segment = route.segments[i];
    if (segment.startsWith('[...')) {
      if (parts.length <= i) return undefined;
      params[segment.slice(4, -1)] = parts.slice(i);
      return params;
    }
    if (parts[i] === undefined) return undefined;
    if (segment.startsWith('[')) params[segment.slice(1, -1)] = parts[i];
    else if (segment !== parts[i]) return undefined;
  }
  return parts.length === route.segments.length ? params : undefined;
}

class FrontNetwork {
  constructor(upstreams) {
    this.upstreams = upstreams;
    this.routes = appRoutes();
    this.browserCalls = [];
    this.serverCalls = [];
    this.violations = [];
    this.cookies = {};
    this.originalFetch = undefined;
  }

  install() {
    this.originalFetch = global.fetch;
    const realFetch = this.originalFetch;
    global.fetch = async (input, init = {}) => {
      const request = input instanceof Request ? input : undefined;
      const url = new URL(request ? request.url : String(input), FRONT_ORIGIN);
      if (url.origin === FRONT_ORIGIN) return this.dispatch(url, init, request);

      const upstream = this.upstreams.find((mock) => mock.url && url.origin === new URL(mock.url).origin);
      if (!upstream) {
        this.violations.push(`appel réseau hors contrat vers ${url.origin}${url.pathname}`);
        throw new TypeError('fetch failed');
      }
      this.serverCalls.push({ service: upstream.service, method: (init.method ?? request?.method ?? 'GET').toUpperCase(), path: url.pathname });
      return realFetch(input, init);
    };
    return this;
  }

  restore() {
    if (this.originalFetch) global.fetch = this.originalFetch;
    this.originalFetch = undefined;
  }

  reset() {
    this.browserCalls.length = 0;
    this.serverCalls.length = 0;
    this.violations.length = 0;
    this.cookies = {};
  }

  /** Résout le handler Next.js qui servirait `pathname`. */
  resolve(pathname) {
    const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    for (const route of this.routes) {
      const params = matchRoute(route, parts);
      if (params) return { ...route, params };
    }
    return undefined;
  }

  async dispatch(url, init, request) {
    const method = (init.method ?? request?.method ?? 'GET').toUpperCase();
    const abortIfNeeded = () => {
      if (init.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    };
    abortIfNeeded();
    this.browserCalls.push({ method, path: url.pathname });
    const route = this.resolve(url.pathname);
    // Sans route.ts, Next.js servirait une page : aucun appel de données ne doit y aboutir.
    if (!route) {
      this.violations.push(`appel navigateur ${method} ${url.pathname} sans handler route.ts`);
      return new Response(null, { status: 404 });
    }
    const handlers = requireSrc(path.relative(SRC, route.file));
    const handler = handlers[method];
    // Comme Next.js : une méthode non exportée par la route répond 405 sans essayer une autre route.
    if (!HTTP_METHODS.includes(method) || typeof handler !== 'function') {
      return new Response(null, { status: 405, headers: { Allow: HTTP_METHODS.filter((name) => typeof handlers[name] === 'function').join(', ') } });
    }

    const headers = new Headers(init.headers ?? request?.headers);
    const cookie = Object.entries(this.cookies).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
    if (cookie) headers.set('cookie', cookie);
    const nextRequest = new NextRequest(url, {
      method,
      headers,
      ...(init.body !== undefined && !['GET', 'HEAD'].includes(method) ? { body: init.body } : {}),
      ...(init.signal ? { signal: init.signal } : {}),
    });
    const response = await handler(nextRequest, { params: Promise.resolve(route.params) });
    // Comme le fetch du navigateur : un signal annulé pendant l'appel rejette avec AbortError.
    abortIfNeeded();
    return response;
  }
}

module.exports = { FrontNetwork, appRoutes };
