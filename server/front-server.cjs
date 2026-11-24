'use strict';

const { EventEmitter } = require('node:events');
const http = require('node:http');

/** How long a shutdown waits for in-flight requests before cutting the remaining connections. */
const SHUTDOWN_DEADLINE_MS = 10_000;

/**
 * Starts Next behind our own HTTP server and owns every upgrade: `relay` gets the first say (the messaging `/ws`),
 * anything else goes to Next's router (the dev server's hot reload).
 *
 * Next's request handler attaches its router's `upgrade` listener to the server of the first request it serves,
 * unless it is given an `httpServer`, and that listener ends the upgrades it does not route, `/ws` included. Next is
 * therefore given a server-shaped sink: the router listens there, and our server forwards it the upgrades the relay
 * declined. (`app.getUpgradeHandler()` is not that router: it reaches the render server, whose `handleUpgrade` is
 * empty.)
 */
async function startFrontServer({ next, options, relay, port, hostname, keepAliveTimeout, log = console.log }) {
  const upgradeSink = new EventEmitter();
  const app = next({ ...options, httpServer: upgradeSink });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((request, response) => { void handle(request, response); });
  if (Number.isFinite(keepAliveTimeout) && keepAliveTimeout >= 0) server.keepAliveTimeout = keepAliveTimeout;
  server.on('upgrade', (request, socket, head) => {
    if (relay(request, socket, head)) return;
    // The router listener exists once Next served its first request (the page that opens the hot reload).
    if (upgradeSink.listenerCount('upgrade') > 0) upgradeSink.emit('upgrade', request, socket, head);
    else socket.destroy();
  });
  await new Promise(resolve => server.listen(port, hostname, resolve));
  log(`> Ready on http://${hostname}:${server.address().port}`);
  return server;
}

/**
 * Graceful stop: no new connection, open WebSockets closed with `1001` (the contract's "going away"), idle keep-alive
 * connections dropped, in-flight requests given until `deadline` to finish; then `done` is called.
 */
function stopFrontServer(server, { closeSockets = () => {}, deadline = SHUTDOWN_DEADLINE_MS, done = () => {} } = {}) {
  let finished = false;
  const finish = () => { if (finished) return; finished = true; clearTimeout(timer); done(); };
  const timer = setTimeout(() => { server.closeAllConnections(); finish(); }, deadline);
  timer.unref?.();
  server.close(finish);
  closeSockets();
  server.closeIdleConnections();
}

module.exports = { startFrontServer, stopFrontServer, SHUTDOWN_DEADLINE_MS };
