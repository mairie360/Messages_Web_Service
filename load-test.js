import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ---------------------------------------------------------------------------
// k6 load test of the Messages front (Messages_Web_Service).
// Two scenarios run side by side against the routes the Next.js server really serves:
//   * `reads`: the page (Next.js render behind the authentication middleware), /health, then the
//     /api/bff/me (session), /api/bff/messaging/bootstrap, /api/bff/conversations and
//     /api/bff/contacts reads the page fetches, relayed by the same-origin proxy to BFF Message,
//     the only BFF of this front;
//   * `writes` (MAIR-516): a direct message to the seeded contact (user 3 of init-test.sql),
//     POST /api/bff/direct-messages, then a reply in that conversation,
//     POST /api/bff/conversations/{id}/messages (-> BFF Message -> Message API).
//     POST /attachments is left out: the pinned BFF Message answers 503 to it (MAIR-512).
// Authentication goes through the accessToken cookie, like in the browser: the proxy turns it
// into Authorization: Bearer for the BFF.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5003';
// Doit correspondre au JWT_SECRET des services de la stack de test (Message API).
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
// User inserted by init-test.sql (token `sub`).
const USER_ID = __ENV.PERF_USER_ID || '2';

const STAGES = [
  { duration: '30s', target: 20 }, // ramp up
  { duration: '1m', target: 20 }, // plateau
  { duration: '10s', target: 0 }, // ramp down
];

export const options = {
  scenarios: {
    reads: { executor: 'ramping-vus', startVUs: 0, stages: STAGES, exec: 'reads', gracefulRampDown: '5s' },
    // Few VUs on purpose: every iteration stores two messages in the Message API database.
    writes: { executor: 'constant-vus', vus: 3, duration: '1m40s', exec: 'writes' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% of HTTP errors
    checks: ['rate>0.99'], // a redirect (307) is not an HTTP error: the checks catch it
    'http_req_duration{endpoint:page}': ['p(95)<800'],      // Next.js page render
    'http_req_duration{endpoint:health}': ['p(95)<150'],    // same-origin proxy -> BFF /health
    'http_req_duration{endpoint:session}': ['p(95)<500'],   // /api/bff/me -> BFF Message
    'http_req_duration{endpoint:messaging}': ['p(95)<600'], // proxy + BFF aggregation + upstream
    'http_req_duration{endpoint:message-send}': ['p(95)<1000'], // proxy -> BFF Message -> Message API insert
  },
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// JWT HS256 minimal accepté par Message API (claims sub + role + exp).
function mintJwt() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: USER_ID, role: 'user', exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

export function setup() {
  return { token: mintJwt() };
}

export function reads(data) {
  const cookie = { Cookie: `accessToken=${data.token}` };
  // redirects: 0 : a redirect (e.g. to the Login front when the cookie is refused)
  // must fail the check instead of being followed outside the stack.
  const pageParams = { headers: cookie, redirects: 0, tags: { endpoint: 'page' } };
  const dataParams = { headers: { ...cookie, Accept: 'application/json' }, redirects: 0, tags: { endpoint: 'messaging' } };

  group('pages', () => {
    const home = http.get(`${BASE_URL}/`, pageParams);
    check(home, { 'page / 200': (r) => r.status === 200 });
  });

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, { headers: cookie, redirects: 0, tags: { endpoint: 'health' } });
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  // Browser paths of the page (src/clients/messageClient.ts prefixes /api/bff), not the root catch-all.
  group('session', () => {
    const me = http.get(`${BASE_URL}/api/bff/me`, { headers: { ...cookie, Accept: 'application/json' }, redirects: 0, tags: { endpoint: 'session' } });
    check(me, { '/api/bff/me 200': (r) => r.status === 200 });
  });

  group('messaging reads', () => {
    const messagingBootstrap = http.get(`${BASE_URL}/api/bff/messaging/bootstrap`, dataParams);
    check(messagingBootstrap, { '/api/bff/messaging/bootstrap 200': (r) => r.status === 200 });

    const conversations = http.get(`${BASE_URL}/api/bff/conversations`, dataParams);
    check(conversations, { '/api/bff/conversations 200': (r) => r.status === 200 });

    const contacts = http.get(`${BASE_URL}/api/bff/contacts`, dataParams);
    check(contacts, { '/api/bff/contacts 200': (r) => r.status === 200 });
  });

  sleep(1);
}

// The seeded contact the direct message goes to (init-test.sql inserts user 3).
const CONTACT_ID = __ENV.PERF_CONTACT_ID || '3';

function conversationId(response) {
  try {
    const body = response.json();
    const id = body && body.conversation && body.conversation.id;
    return id === undefined || id === null ? null : String(id);
  } catch {
    return null;
  }
}

export function writes(data) {
  const headers = { Cookie: `accessToken=${data.token}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  group('message sending', () => {
    const sent = http.post(
      `${BASE_URL}/api/bff/direct-messages`,
      JSON.stringify({ recipientId: CONTACT_ID, message: `k6 direct message ${__VU}-${__ITER}` }),
      { headers, redirects: 0, tags: { endpoint: 'message-send' } },
    );
    const id = conversationId(sent);
    const ok = check(sent, {
      'POST /api/bff/direct-messages 200 or 201': (r) => r.status === 200 || r.status === 201,
      'POST /api/bff/direct-messages returns the conversation id': () => id !== null,
    });
    if (!ok) return;

    const reply = http.post(
      `${BASE_URL}/api/bff/conversations/${id}/messages`,
      JSON.stringify({ content: `k6 reply ${__VU}-${__ITER}` }),
      { headers, redirects: 0, tags: { endpoint: 'message-send' } },
    );
    check(reply, { 'POST /api/bff/conversations/{id}/messages 200 or 201': (r) => r.status === 200 || r.status === 201 });
  });

  sleep(1);
}
