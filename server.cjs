'use strict';

/**
 * Node server around Next.js: Next serves every HTTP request, and the messaging WebSocket `/ws` is relayed to
 * BFF_Message by `server/ws-relay.cjs` (a Next.js route handler cannot accept an HTTP upgrade). Any other upgrade
 * (the dev server's hot reload) goes to Next.
 *
 *   node server.cjs                          development (`npm run dev`), port 5003
 *   NODE_ENV=production node server.cjs      after `next build`: in the image, next to the standalone output
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const dev = process.env.NODE_ENV !== 'production';
const dir = __dirname;
const port = Number.parseInt(process.env.PORT ?? '', 10) || 5003;
// Like `next dev`, the dev server listens on every interface (in a container, HOSTNAME is the container's name).
const hostname = dev ? '0.0.0.0' : process.env.HOSTNAME || '0.0.0.0';

let conf;
if (!dev) {
  // Same start as the generated standalone server.js: the build's config, no next.config.ts at run time.
  process.chdir(dir);
  conf = JSON.parse(fs.readFileSync(path.join(dir, '.next', 'required-server-files.json'), 'utf8')).config;
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(conf);
}

const next = require('next');
const { WebSocket, WebSocketServer } = require('ws');
const contract = require('./contracts/openapi.json');
const { createWsRelay } = require('./server/ws-relay.cjs');

// Same variables as the HTTP proxy (src/lib/bff-proxy.ts).
const bffUrl = () => (process.env.BFF_MESSAGE_BASE_URL ?? process.env.MESSAGE_BFF_URL ?? process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL ?? '').trim();
const frontUrl = () => (process.env.MESSAGE_FRONT_URL ?? '').trim();

async function main() {
  const app = next({ dev, dir, hostname: dev ? 'localhost' : hostname, port, ...(conf ? { conf } : {}) });
  const handle = app.getRequestHandler();
  await app.prepare();
  const nextUpgrade = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : undefined;
  const relay = createWsRelay({
    WebSocket, WebSocketServer, paths: () => contract.paths, bffUrl, frontUrl,
    log: (message, error) => console.warn(message, error instanceof Error ? error.message : ''),
  });

  const server = http.createServer((request, response) => { void handle(request, response); });
  const keepAliveTimeout = Number.parseInt(process.env.KEEP_ALIVE_TIMEOUT ?? '', 10);
  if (Number.isFinite(keepAliveTimeout) && keepAliveTimeout >= 0) server.keepAliveTimeout = keepAliveTimeout;
  server.on('upgrade', (request, socket, head) => {
    if (relay(request, socket, head)) return;
    if (nextUpgrade) void nextUpgrade(request, socket, head);
    else socket.destroy();
  });
  server.listen(port, hostname, () => console.log(`> Ready on http://${hostname}:${port}`));

  const stop = () => { server.close(); server.closeAllConnections?.(); process.exit(0); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
