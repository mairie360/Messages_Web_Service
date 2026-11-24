const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const http = require('node:http');
const { afterEach, test } = require('node:test');
const { startFrontServer, stopFrontServer } = require('../server/front-server.cjs');

// MAIR-818 bug found on the e2e stack: once the page had served one HTTP request, every /ws handshake was hung up.
// Next's request handler attaches an `upgrade` listener to the server of the first request it serves (unless it is
// given `httpServer`), and that listener ends the upgrades it does not route. The fake below reproduces Next 16's
// `NextCustomServer` (next/dist/server/next.js): `setupWebSocketHandler` puts the router's upgrade handler (hot reload,
// ends anything else) on `httpServer` or the request's server, and `getUpgradeHandler()` reaches the render server,
// whose `handleUpgrade` does nothing.

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
          // Next's router upgrade handler: the hot reload is answered, anything else is ended.
          customServer.on('upgrade', (request, socket) => {
            if (request.url !== '/_next/webpack-hmr') { socket.destroy(); return; }
            seen.nextUpgrades.push(request.url);
            socket.end('HTTP/1.1 426 Upgrade Required\r\nContent-Length: 0\r\n\r\n');
          });
        }
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('page');
      },
      // The render server's handleUpgrade: it never answers.
      getUpgradeHandler: () => async () => {},
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

test('MAIR-818 an upgrade before Next served any request is closed rather than left hanging', async () => {
  const { next } = fakeNext();
  server = await startFrontServer({ next, relay, options: { dev: true }, port: 0, hostname: '127.0.0.1', log: () => {} });
  assert.equal(await upgrade(server.address().port, '/_next/webpack-hmr'), 'socket hang up');
});

test('MAIR-818 a shutdown closes the WebSockets with 1001 and lets an in-flight request finish', async () => {
  let release;
  const slow = () => ({
    prepare: async () => {},
    getRequestHandler: () => async (_request, response) => { await new Promise(resolve => { release = resolve; }); response.end('done'); },
  });
  server = await startFrontServer({ next: slow, relay, options: {}, port: 0, hostname: '127.0.0.1', log: () => {} });
  const { port } = server.address();
  const answer = new Promise(resolve => http.get({ host: '127.0.0.1', port, path: '/' }, response => {
    let body = ''; response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve(body));
  }));
  await new Promise(resolve => setTimeout(resolve, 50));
  const closed = [];
  const stopped = new Promise(resolve => stopFrontServer(server, { closeSockets: () => closed.push(1001), deadline: 5_000, done: resolve }));
  release();
  assert.equal(await answer, 'done', 'the in-flight request is answered');
  await stopped;
  assert.deepEqual(closed, [1001]);
  server = undefined;
});

test('MAIR-818 a shutdown cuts what is still open at the deadline', async () => {
  const stuck = () => ({ prepare: async () => {}, getRequestHandler: () => async () => {} });
  server = await startFrontServer({ next: stuck, relay, options: {}, port: 0, hostname: '127.0.0.1', log: () => {} });
  const { port } = server.address();
  const request = new Promise(resolve => http.get({ host: '127.0.0.1', port, path: '/' }).on('error', error => resolve(error.message)));
  await new Promise(resolve => setTimeout(resolve, 50));
  const started = Date.now();
  await new Promise(resolve => stopFrontServer(server, { deadline: 200, done: resolve }));
  assert.ok(Date.now() - started >= 150);
  assert.equal(await request, 'socket hang up');
  server = undefined;
});
