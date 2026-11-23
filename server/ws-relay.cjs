'use strict';

/**
 * Relay of the messaging WebSocket: browser `GET /ws` on the front origin → BFF_Message `GET /ws`.
 *
 * A Next.js route handler cannot accept an HTTP upgrade, so the Node server around Next (`server.cjs`) hands every
 * upgrade of the contract's `/ws` path to this relay. It follows the frozen contract (Message_API
 * `docs/en/realtime-websocket.md`): it checks the handshake, the `Origin` and the `accessToken` cookie before any
 * upstream call, forwards no cookie but `Authorization: Bearer <accessToken>`, upgrades the browser only once the BFF
 * accepted, then passes frames, pings and closes through. A refusal is a real HTTP status with the front's error body.
 */
const { STATUS_CODES } = require('node:http');

const MAX_FRAME_BYTES = 4096;
const HANDSHAKE_TIMEOUT_MS = 10_000;
const UPSTREAM_UNAVAILABLE = 1013;
const SESSION_EXPIRED = 'Votre session a expiré. Veuillez vous reconnecter.';
const UNAVAILABLE = 'La réception en temps réel est temporairement indisponible.';
const cookieValue = value => typeof value === 'string' && /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+$/.test(value);

/** Origin of a configured public URL, or `undefined` when it is missing or not an http(s) URL. */
function publicOrigin(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.origin : undefined;
  } catch { return undefined; }
}

/** The BFF's `/ws` as a `ws:`/`wss:` URL, or `undefined` when the BFF URL is not configured. */
function upstreamSocketUrl(baseUrl, path) {
  try {
    const url = new URL(`${String(baseUrl ?? '').trim().replace(/\/+$/, '')}${path}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  } catch { return undefined; }
}

/** The `accessToken` cookie when it is well formed and, for a JWT, not expired. */
function liveAccessToken(cookieHeader, now = Date.now()) {
  const token = String(cookieHeader ?? '').split(';').map(part => part.trim())
    .find(part => part.startsWith('accessToken='))?.slice('accessToken='.length);
  if (!cookieValue(token)) return undefined;
  const segments = token.split('.');
  if (segments.length !== 3) return token;
  try {
    const { exp } = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp * 1000 <= now ? undefined : token;
  } catch { return token; }
}

/** RFC 6455 §4.2.1: a `GET` asking for `Upgrade: websocket`, version 13, with a 16-byte base64 key. */
function isWebSocketHandshake(request) {
  const header = name => String(request.headers[name] ?? '');
  return request.method === 'GET'
    && header('upgrade').split(',').some(value => value.trim().toLowerCase() === 'websocket')
    && header('connection').split(',').some(value => value.trim().toLowerCase() === 'upgrade')
    && header('sec-websocket-version').trim() === '13'
    && /^[A-Za-z0-9+/]{22}==$/.test(header('sec-websocket-key').trim());
}

/** Answers a refused handshake on the raw socket with the front's error body, then closes it. */
function refuse(socket, status, message) {
  if (socket.destroyed) return;
  const body = JSON.stringify({ error: { message } });
  socket.end([
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}`,
    'Content-Type: application/json; charset=utf-8',
    'Cache-Control: no-store',
    'Connection: close',
    `Content-Length: ${Buffer.byteLength(body)}`,
    '', body,
  ].join('\r\n'));
  socket.destroySoon?.();
}

/** A close code this hop may send to the browser for an upstream close (abnormal ends become `1013`). */
function clientCloseCode(code) {
  if ([1000, 1001, 1003, 1007, 1008, 1009, 1011, 1012, 1013, 1014].includes(code) || (code >= 3000 && code <= 4999)) return code;
  return UPSTREAM_UNAVAILABLE;
}

/** A close code this hop may send upstream for a browser close (`1000` for anything else). */
function upstreamCloseCode(code) {
  return code === 1000 || code === 1001 || (code >= 3000 && code <= 4999) ? code : 1000;
}

/** Passes frames, pings and closes between the two sockets until one of them ends. */
function bridge(client, upstream) {
  let closed = false;
  const closeBoth = (target, code, reason) => {
    if (closed) return;
    closed = true;
    if (target.readyState === target.OPEN || target.readyState === target.CONNECTING) target.close(code, reason);
  };
  upstream.on('message', (data, isBinary) => { if (client.readyState === client.OPEN) client.send(data, { binary: isBinary }); });
  client.on('message', (data, isBinary) => { if (upstream.readyState === upstream.OPEN) upstream.send(data, { binary: isBinary }); });
  // Transparent liveness: the BFF's ping reaches the browser, the browser's pong goes back to the BFF.
  upstream.on('ping', data => { if (client.readyState === client.OPEN) client.ping(data); });
  client.on('pong', data => { if (upstream.readyState === upstream.OPEN) upstream.pong(data); });
  upstream.on('close', (code, reason) => closeBoth(client, clientCloseCode(code), clientCloseCode(code) === code ? reason : 'upstream unavailable'));
  client.on('close', (code, reason) => closeBoth(upstream, upstreamCloseCode(code), upstreamCloseCode(code) === code ? reason : ''));
  upstream.on('error', () => closeBoth(client, UPSTREAM_UNAVAILABLE, 'upstream unavailable'));
  client.on('error', () => closeBoth(upstream, 1000, ''));
}

/**
 * Builds the upgrade handler. `handleUpgrade(request, socket, head)` returns `false` for another path (left to Next)
 * and handles the contract's `/ws` otherwise. `config` is read on every handshake, like the proxy's settings.
 */
function createWsRelay({ WebSocket, WebSocketServer, paths, bffUrl, frontUrl, now = Date.now, handshakeTimeout = HANDSHAKE_TIMEOUT_MS, log = () => undefined }) {
  const path = '/ws';
  const server = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES, perMessageDeflate: false, clientTracking: false });

  return function handleUpgrade(request, socket, head) {
    let pathname;
    try { pathname = new URL(request.url ?? '/', 'http://front.invalid').pathname; } catch { return false; }
    if (pathname !== path) return false;
    socket.on('error', () => socket.destroy());

    if (!isWebSocketHandshake(request)) { refuse(socket, 400, 'Cette demande doit ouvrir une connexion WebSocket.'); return true; }
    const target = upstreamSocketUrl(bffUrl(), path);
    const ownOrigin = publicOrigin(frontUrl());
    if (!paths()?.[path]?.get || !target || !ownOrigin) { refuse(socket, 503, 'La réception en temps réel n’est pas configurée.'); return true; }
    if (request.headers.origin !== ownOrigin) { refuse(socket, 403, 'Cette demande doit provenir de cet outil Mairie360.'); return true; }
    const token = liveAccessToken(request.headers.cookie, now());
    if (!token) { refuse(socket, 401, SESSION_EXPIRED); return true; }

    // Only the bearer goes upstream: no cookie, no browser header.
    const upstream = new WebSocket(target, {
      headers: { Authorization: `Bearer ${token}` }, handshakeTimeout, maxPayload: MAX_FRAME_BYTES,
      perMessageDeflate: false, followRedirects: false, autoPong: false,
    });
    let settled = false;
    const browserLeft = () => { if (!settled) { settled = true; upstream.terminate(); } };
    socket.once('close', browserLeft);
    upstream.once('unexpected-response', (_request, response) => {
      response.resume();
      if (settled) return;
      settled = true;
      upstream.terminate();
      refuse(socket, response.statusCode === 401 ? 401 : 502, response.statusCode === 401 ? SESSION_EXPIRED : UNAVAILABLE);
    });
    upstream.once('error', error => {
      if (settled) return;
      settled = true;
      log('messaging websocket upstream unavailable', error);
      refuse(socket, 502, UNAVAILABLE);
    });
    upstream.once('open', () => {
      if (settled) { upstream.close(1000); return; }
      settled = true;
      socket.off('close', browserLeft);
      server.handleUpgrade(request, socket, head, client => bridge(client, upstream));
    });
    return true;
  };
}

module.exports = { createWsRelay, liveAccessToken, isWebSocketHandshake, upstreamSocketUrl, publicOrigin, clientCloseCode, upstreamCloseCode };
