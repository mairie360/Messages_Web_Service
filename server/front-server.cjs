'use strict';

const { EventEmitter } = require('node:events');
const http = require('node:http');

/**
 * Starts Next behind our own HTTP server and owns every upgrade: `relay` gets the first say (the messaging `/ws`),
 * anything else goes to Next's upgrade handler (the dev server's hot reload).
 *
 * Next's request handler attaches its own `upgrade` listener to the server of the first request it serves, unless it
 * is given an `httpServer`, and that listener ends the upgrades it does not route, `/ws` included. Next is therefore
 * given a server-shaped sink that never emits: our server is the only one dispatching upgrades.
 */
async function startFrontServer({ next, options, relay, port, hostname, keepAliveTimeout, log = console.log }) {
  const upgradeSink = new EventEmitter();
  const app = next({ ...options, httpServer: upgradeSink });
  const handle = app.getRequestHandler();
  await app.prepare();
  const nextUpgrade = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : undefined;

  const server = http.createServer((request, response) => { void handle(request, response); });
  if (Number.isFinite(keepAliveTimeout) && keepAliveTimeout >= 0) server.keepAliveTimeout = keepAliveTimeout;
  server.on('upgrade', (request, socket, head) => {
    if (relay(request, socket, head)) return;
    if (nextUpgrade) void Promise.resolve(nextUpgrade(request, socket, head)).catch(() => socket.destroy());
    else socket.destroy();
  });
  await new Promise(resolve => server.listen(port, hostname, resolve));
  log(`> Ready on http://${hostname}:${server.address().port}`);
  return server;
}

module.exports = { startFrontServer };
