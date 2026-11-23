const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const http = require('node:http');
const { afterEach, test } = require('node:test');
const { startFrontServer } = require('../server/front-server.cjs');

// MAIR-818 bug found on the e2e stack: once the page had served one HTTP request, every /ws handshake was hung up.
// Next's request handler attaches an `upgrade` listener to the server of the first request it serves (unless it is
// given `httpServer`), and that listener ends the upgrades it does not route. The fake below reproduces
// `NextCustomServer.setupWebSocketHandler` (next/dist/server/next.js) as it is.

let server;
afterEach(async () => { server?.closeAllConnections(); await new Promise(resolve => (server ? server.close(resolve) : resolve())); server = undefined; });

function fakeNext() {
  const seen = { options: undefined, nextUpgrades: [] };
  const next = (options) => {
    seen.options = options;
    let didWebSocketSetup = false;
    return {
      prepare: async () => {},
      getRequestHandler: () => async (request, response) => {
        if (!didWebSocketSetup) {
          didWebSocketSetup = true;
          const customServer = options.httpServer || request.socket.server;
          // Next's upgrade handler: what it does not route is ended.
          customServer.on('upgrade', (_request, socket) => socket.destroy());
        }
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('page');
      },
      getUpgradeHandler: () => async (request, socket) => {
        seen.nextUpgrades.push(request.url);
        socket.end('HTTP/1.1 426 Upgrade Required\r\nContent-Length: 0\r\n\r\n');
      },
    };
  };
  return { next, seen };
}

/** A relay standing for ws-relay: it answers its own path with a 101 and declines the others. */
const relay = (request, socket) => {
  if (new URL(request.url, 'http://x').pathname !== '/ws') return false;
  socket.end('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
  return true;
};

function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject);
  });
}

function upgrade(port, path) {
  return new Promise((resolve) => {
    const request = http.request({ host: '127.0.0.1', port, path, headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64') } });
    request.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    request.on('response', response => { response.resume(); resolve(response.statusCode); });
    request.on('error', error => resolve(error.message));
    request.end();
  });
}

test('MAIR-818 /ws still reaches the relay after the page served HTTP requests', async () => {
  const { next, seen } = fakeNext();
  server = await startFrontServer({ next, relay, options: { dev: false }, port: 0, hostname: '127.0.0.1', log: () => {} });
  const { port } = server.address();
  assert.equal(await upgrade(port, '/ws'), 101, 'before any page request');
  assert.equal(await get(port, '/'), 200);
  assert.equal(await upgrade(port, '/ws'), 101, 'after Next set its upgrade listener up');
  assert.equal(server.listenerCount('upgrade'), 1, 'only our dispatcher listens to upgrades');
  assert.ok(seen.options.httpServer, 'Next is given its own sink instead of our server');
  assert.notEqual(seen.options.httpServer, server);
});

test('MAIR-818 other upgrades (hot reload) still go to Next', async () => {
  const { next, seen } = fakeNext();
  server = await startFrontServer({ next, relay, options: { dev: true }, port: 0, hostname: '127.0.0.1', log: () => {} });
  const { port } = server.address();
  await get(port, '/');
  assert.equal(await upgrade(port, '/_next/webpack-hmr'), 426);
  assert.deepEqual(seen.nextUpgrades, ['/_next/webpack-hmr']);
});
