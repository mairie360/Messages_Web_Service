const assert = require('node:assert/strict');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { WebSocket, WebSocketServer } = require('ws');
const contract = require('../contracts/openapi.json');
const { createWsRelay, liveAccessToken, isWebSocketHandshake, upstreamSocketUrl, clientCloseCode, upstreamCloseCode } = require('../server/ws-relay.cjs');

// MAIR-818: the front's /ws relay (server.cjs + server/ws-relay.cjs) against a real WebSocket server standing for
// BFF_Message, following Message_API docs/en/realtime-websocket.md (front column of the handshake table, frames, closes).

const jwt = (payload) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'c2lnbmF0dXJl'].join('.');
const LIVE = jwt({ sub: '2', exp: Math.floor(Date.now() / 1000) + 3600 });
const EXPIRED = jwt({ sub: '2', exp: Math.floor(Date.now() / 1000) - 10 });
const FRONT = 'http://messages.mairie.test';

let bff; let bffServer; let front; let frontUrl; let config; const upgrades = [];
let onBffConnection = () => {};
let bffRefusal;

const listen = (server) => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`127.0.0.1:${server.address().port}`)));

before(async () => {
  bffServer = http.createServer((_request, response) => { response.writeHead(400); response.end(); });
  bff = new WebSocketServer({ noServer: true });
  bffServer.on('upgrade', (request, socket, head) => {
    upgrades.push({ url: request.url, headers: request.headers });
    if (bffRefusal) { socket.end(`HTTP/1.1 ${bffRefusal} Refused\r\nContent-Length: 0\r\n\r\n`); return; }
    bff.handleUpgrade(request, socket, head, client => onBffConnection(client, request));
  });
  const bffAddress = await listen(bffServer);
  config = { bff: `http://${bffAddress}`, front: FRONT, paths: contract.paths };
  const relay = createWsRelay({
    WebSocket, WebSocketServer, paths: () => config.paths, bffUrl: () => config.bff, frontUrl: () => config.front, handshakeTimeout: 1_000,
  });
  front = http.createServer((_request, response) => { response.writeHead(204); response.end(); });
  front.on('upgrade', (request, socket, head) => { if (!relay(request, socket, head)) socket.destroy(); });
  frontUrl = `ws://${await listen(front)}`;
});
after(async () => {
  front.closeAllConnections(); bffServer.closeAllConnections();
  await new Promise(resolve => front.close(resolve));
  await new Promise(resolve => bffServer.close(resolve));
});
beforeEach(() => {
  upgrades.length = 0; bffRefusal = undefined; onBffConnection = () => {};
  config.bff = config.bff.replace(/:\d+$/, `:${bffServer.address().port}`); config.front = FRONT; config.paths = contract.paths;
});
afterEach(() => { for (const client of bff.clients) client.terminate(); });

/** Opens the front's /ws like a browser and resolves with the refusal status or the socket once open. */
function connect({ origin = FRONT, cookie = `accessToken=${LIVE}; refreshToken=refresh-secret`, path = '/ws' } = {}) {
  return new Promise((resolve) => {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (cookie) headers.Cookie = cookie;
    const socket = new WebSocket(`${frontUrl}${path}`, { headers });
    socket.once('unexpected-response', (_request, response) => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: body ? JSON.parse(body) : null, type: response.headers['content-type'] }));
    });
    socket.once('open', () => resolve({ socket }));
    socket.once('error', error => resolve({ error }));
  });
}
const closed = (socket) => new Promise(resolve => socket.once('close', (code, reason) => resolve({ code, reason: String(reason) })));
const nextMessage = (socket) => new Promise(resolve => socket.once('message', data => resolve(String(data))));
const bffConnection = () => new Promise(resolve => { onBffConnection = (client, request) => resolve({ client, request }); });

test('MAIR-818 a request that is not a WebSocket handshake gets 400 before any upstream call', async () => {
  const { port } = new URL(frontUrl.replace('ws:', 'http:'));
  const status = await new Promise(resolve => {
    const request = http.request({ host: '127.0.0.1', port, path: '/ws', headers: { Connection: 'Upgrade', Upgrade: 'websocket', Origin: FRONT } });
    request.on('response', response => { response.resume(); resolve(response.statusCode); });
    request.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    request.end();
  });
  assert.equal(status, 400);
  assert.equal(upgrades.length, 0);
});

test('MAIR-818 a foreign or missing Origin gets 403 before any upstream call', async () => {
  for (const origin of ['https://evil.example', null]) {
    const answer = await connect({ origin });
    assert.equal(answer.status, 403, String(origin));
    assert.equal(answer.type, 'application/json; charset=utf-8');
    assert.equal(answer.body.error.message, 'Cette demande doit provenir de cet outil Mairie360.');
  }
  assert.equal(upgrades.length, 0);
});

test('MAIR-818 a missing, malformed or expired accessToken cookie gets 401 before any upstream call', async () => {
  for (const cookie of [null, 'refreshToken=only', 'accessToken=bad"value', `accessToken=${EXPIRED}`]) {
    const answer = await connect({ cookie });
    assert.equal(answer.status, 401, String(cookie));
    assert.equal(answer.body.error.message, 'Votre session a expiré. Veuillez vous reconnecter.');
  }
  assert.equal(upgrades.length, 0);
});

test('MAIR-818 an unconfigured BFF or front URL, or a contract without /ws, gets 503', async () => {
  for (const change of [{ bff: '' }, { bff: 'ftp://bff' }, { front: '' }, { paths: { '/me': contract.paths['/me'] } }]) {
    Object.assign(config, change);
    const answer = await connect();
    assert.equal(answer.status, 503, JSON.stringify(change));
    assert.equal(answer.body.error.message, 'La réception en temps réel n’est pas configurée.');
    config.bff = `http://127.0.0.1:${bffServer.address().port}`; config.front = FRONT; config.paths = contract.paths;
  }
  assert.equal(upgrades.length, 0);
});

test('MAIR-818 the BFF gets the bearer only: no cookie, no browser Origin, nothing in the URL', async () => {
  const connection = bffConnection();
  const { socket } = await connect({ path: '/ws?token=leak' });
  const { request } = await connection;
  assert.equal(request.url, '/ws');
  assert.equal(request.headers.authorization, `Bearer ${LIVE}`);
  assert.equal(request.headers.cookie, undefined);
  assert.notEqual(request.headers.origin, FRONT);
  socket.close(1000);
});

test('MAIR-818 a BFF refusal is answered with a real status: 401 stays 401, anything else is 502', async () => {
  for (const [refusal, status] of [[401, 401], [503, 502], [500, 502]]) {
    bffRefusal = refusal;
    const answer = await connect();
    assert.equal(answer.status, status, String(refusal));
  }
});

test('MAIR-818 an unreachable BFF gets 502', async () => {
  config.bff = 'http://127.0.0.1:1';
  const answer = await connect();
  assert.equal(answer.status, 502);
  assert.equal(answer.body.error.message, 'La réception en temps réel est temporairement indisponible.');
});

test('MAIR-818 signals are relayed unchanged, client frames go upstream, and pings reach the browser', async () => {
  const connection = bffConnection();
  const { socket } = await connect();
  const { client } = await connection;
  const signal = JSON.stringify({ type: 'NEW_MSG', conversationId: 'conversation-5', messageId: 'message-118' });
  const received = nextMessage(socket);
  client.send(signal);
  assert.equal(await received, signal);
  const upstreamFrame = new Promise(resolve => client.once('message', data => resolve(String(data))));
  socket.send('hello');
  assert.equal(await upstreamFrame, 'hello', 'the BFF, not the relay, drops client data');
  const pong = new Promise(resolve => client.once('pong', data => resolve(String(data))));
  client.ping('liveness');
  assert.equal(await pong, 'liveness', 'the browser pong answers the BFF ping through the relay');
  socket.close(1000);
});

test('MAIR-818 the BFF close codes the client acts on are relayed, an abnormal end becomes 1013', async () => {
  for (const [send, expected] of [[c => c.close(4001, 'session expired'), [4001, 'session expired']], [c => c.close(4008, 'evicted'), [4008, 'evicted']], [c => c.close(1001, 'going away'), [1001, 'going away']], [c => c.terminate(), [1013, 'upstream unavailable']]]) {
    const connection = bffConnection();
    const { socket } = await connect();
    const { client } = await connection;
    const end = closed(socket);
    send(client);
    assert.deepEqual(Object.values(await end), expected);
  }
});

test('MAIR-818 a browser close closes the BFF connection with the same code when it may be sent, 1000 otherwise', async () => {
  for (const [code, expected] of [[1000, 1000], [4000, 4000], [1002, 1000]]) {
    const connection = bffConnection();
    const { socket } = await connect();
    const { client } = await connection;
    const end = closed(client);
    if (code === 1002) socket._socket.destroy(); else socket.close(code);
    assert.equal((await end).code, expected, String(code));
  }
});

test('MAIR-818 a frame over 4 KiB from the browser closes it with 1009', async () => {
  const connection = bffConnection();
  const { socket } = await connect();
  await connection;
  const end = closed(socket);
  socket.send('x'.repeat(5000));
  assert.equal((await end).code, 1009);
});

test('MAIR-818 other paths are left to Next', async () => {
  const answer = await connect({ path: '/_next/webpack-hmr' });
  assert.ok(answer.error, 'the test server destroys what the relay declines');
  assert.equal(upgrades.length, 0);
});

test('MAIR-818 relay helpers: cookie, handshake, upstream URL and close-code mapping', () => {
  assert.equal(liveAccessToken(`a=1; accessToken=${LIVE}`), LIVE);
  assert.equal(liveAccessToken(`accessToken=${EXPIRED}`), undefined);
  assert.equal(liveAccessToken('accessToken=opaque-token'), 'opaque-token');
  assert.equal(liveAccessToken('accessToken=a.%%%.c'), 'a.%%%.c', 'a token that is not a readable JWT is left to the BFF');
  assert.equal(liveAccessToken(undefined), undefined);
  const headers = { upgrade: 'websocket', connection: 'keep-alive, Upgrade', 'sec-websocket-version': '13', 'sec-websocket-key': randomBytes(16).toString('base64') };
  assert.equal(isWebSocketHandshake({ method: 'GET', headers }), true);
  assert.equal(isWebSocketHandshake({ method: 'POST', headers }), false);
  assert.equal(isWebSocketHandshake({ method: 'GET', headers: { ...headers, 'sec-websocket-version': '8' } }), false);
  assert.equal(upstreamSocketUrl('https://bff.mairie.test/', '/ws'), 'wss://bff.mairie.test/ws');
  assert.equal(upstreamSocketUrl('http://bff:4003', '/ws'), 'ws://bff:4003/ws');
  assert.equal(upstreamSocketUrl('http://user:pass@bff', '/ws'), undefined);
  assert.equal(upstreamSocketUrl('not a url', '/ws'), undefined);
  assert.deepEqual([1000, 1001, 1009, 1011, 4001, 4008, 1005, 1006, 1015, 2000].map(clientCloseCode), [1000, 1001, 1009, 1011, 4001, 4008, 1013, 1013, 1013, 1013]);
  assert.deepEqual([1000, 1001, 4000, 1002, 1005, 1006].map(upstreamCloseCode), [1000, 1001, 4000, 1000, 1000, 1000]);
});
