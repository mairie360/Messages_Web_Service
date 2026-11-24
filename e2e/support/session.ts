import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';

// Only Core API signs session tokens (MAIR-680): EdDSA JWTs under the `kid` of its Ed25519 key.
// The run's key pair comes from stack_secrets.sh (e2e_test.sh): Core gets it, the other services
// only the public key, and the journeys sign the session of a seeded user with the private one,
// exactly like Core would. The front only checks the `exp` claim before relaying the cookie as a
// Bearer token, and the BFF reads the user's role from the token's `role` claim, as Login issues it.
export const ACCESS_TOKEN_COOKIE = 'accessToken';

export interface SeededUser {
  /** `users.id` in init-test.sql (claim `sub`). */
  id: string;
  /** Role Login would put in the token (claim `role`). */
  role: 'Admin' | 'Maire' | 'Responsable' | 'User' | 'Guest';
}

/** Private key of the run (PEM, `\n`-escaped line breaks accepted) and the `kid` Core gives its tokens. */
function signingKey() {
  const pem = process.env.E2E_JWT_PRIVATE_KEY ?? process.env.JWT_PRIVATE_KEY;
  if (!pem) {
    throw new Error('E2E_JWT_PRIVATE_KEY is not set: run ./e2e_test.sh, or source ./stack_secrets.sh first.');
  }
  const key = createPrivateKey(pem.replace(/\\n/g, '\n'));
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('E2E_JWT_PRIVATE_KEY is not an Ed25519 key.');
  // RFC 7638 thumbprint of the public key, computed like mairie360_api_lib does.
  const { x } = createPublicKey(key).export({ format: 'jwk' });
  const kid = createHash('sha256').update(`{"crv":"Ed25519","kty":"OKP","x":"${x}"}`).digest('base64url');
  return { key, kid };
}

/** Seeded users of init-test.sql, by what they may do in this front. */
export const users: Record<'sender' | 'recipient' | 'outsider', SeededUser> = {
  /** "Perf Tester": writes the direct message. */
  sender: { id: process.env.E2E_MANAGER_USER_ID ?? '2', role: 'User' },
  /** "Contact Sample": receives it. */
  recipient: { id: process.env.E2E_MEMBER_USER_ID ?? '3', role: 'User' },
  /** "Agent Externe": takes part in no conversation. */
  outsider: { id: process.env.E2E_OUTSIDER_USER_ID ?? '4', role: 'User' },
};

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

/** EdDSA JWT signed like Core API signs it (claims sub + role + exp + iss + aud). */
export function mintAccessToken(user: SeededUser, ttlSeconds = 3600) {
  const { key, kid } = signingKey();
  const header = base64url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ sub: user.id, role: user.role, exp: now + ttlSeconds, iss: 'mairie360-core', aud: 'mairie360' }),
  );
  const signature = sign(null, Buffer.from(`${header}.${payload}`), key).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

/** Cookie header of a signed-in user, for direct requests to the front (refusal checks). */
export function cookieHeader(user: SeededUser) {
  return `${ACCESS_TOKEN_COOKIE}=${mintAccessToken(user)}`;
}

/** Signs the browser context in as a seeded user, as Login would after a successful sign-in. */
export async function signInAs(context: BrowserContext, baseURL: string, user: SeededUser) {
  await context.addCookies([{ name: ACCESS_TOKEN_COOKIE, value: mintAccessToken(user), url: baseURL }]);
}
