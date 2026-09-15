import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ---------------------------------------------------------------------------
// Test de charge k6 pour le front Messages (Messages_Web_Service).
// Cible les routes réellement servies par le serveur Next.js : les pages (rendu Next.js derrière le middleware d'authentification),
// l'adaptateur de session /api/user/me (-> BFF User),
// /health, puis les lectures /messaging/bootstrap, /conversations et /contacts relayées par le proxy same-origin vers BFF Message.
// L'authentification passe par le cookie accessToken, comme dans le navigateur :
// le proxy le convertit en Authorization: Bearer vers le BFF.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5003';
// Doit correspondre au JWT_SECRET des services core-api / bff-user / APIs de la stack de test.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
// Utilisateur inséré par init-test.sql (sub du token).
const USER_ID = __ENV.PERF_USER_ID || '2';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // montée en charge
    { duration: '1m', target: 20 },  // maintien
    { duration: '10s', target: 0 },  // descente
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],                         // < 1% d'erreurs
    checks: ['rate>0.99'],                                  // une redirection (307) n'est pas une erreur HTTP : les checks la détectent
    'http_req_duration{endpoint:page}': ['p(95)<800'],      // rendu page Next.js
    'http_req_duration{endpoint:health}': ['p(95)<150'],    // proxy same-origin -> BFF /health
    'http_req_duration{endpoint:session}': ['p(95)<500'],   // /api/user/me -> BFF User -> Core
    'http_req_duration{endpoint:messaging}': ['p(95)<600'], // proxy + agrégation BFF + upstream
  },
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// JWT HS256 minimal accepté par Core API / BFF User (claims sub + role + exp).
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

export default function (data) {
  const cookie = { Cookie: `accessToken=${data.token}` };
  // redirects: 0 : une redirection (ex. vers le front Login si le cookie est refusé)
  // doit faire échouer le check au lieu d'être suivie hors de la stack.
  const pageParams = { headers: cookie, redirects: 0, tags: { endpoint: 'page' } };
  const dataParams = { headers: { ...cookie, Accept: 'application/json' }, redirects: 0, tags: { endpoint: 'messaging' } };

  group('pages', () => {
    const home = http.get(`${BASE_URL}/`, pageParams);
    check(home, { 'page / 200': (r) => r.status === 200 });

    const profile = http.get(`${BASE_URL}/profile`, pageParams);
    check(profile, { 'page /profile 200': (r) => r.status === 200 });
  });

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, { headers: cookie, redirects: 0, tags: { endpoint: 'health' } });
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('session', () => {
    const me = http.get(`${BASE_URL}/api/user/me`, { headers: cookie, redirects: 0, tags: { endpoint: 'session' } });
    check(me, { '/api/user/me 200': (r) => r.status === 200 });
  });

  group('messaging reads', () => {
    const messagingBootstrap = http.get(`${BASE_URL}/messaging/bootstrap`, dataParams);
    check(messagingBootstrap, { '/messaging/bootstrap 200': (r) => r.status === 200 });

    const conversations = http.get(`${BASE_URL}/conversations`, dataParams);
    check(conversations, { '/conversations 200': (r) => r.status === 200 });

    const contacts = http.get(`${BASE_URL}/contacts`, dataParams);
    check(contacts, { '/contacts 200': (r) => r.status === 200 });
  });

  sleep(1);
}
