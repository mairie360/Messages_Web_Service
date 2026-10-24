import { createHmac } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';

// The stack shares one JWT_SECRET from the front's BFF down to the APIs (docker-compose-e2e.yml):
// a token signed with it for a seeded user is a valid session, exactly like the k6 load test
// does. The front only checks the `exp` claim before relaying the cookie as a Bearer token, and
// the BFF reads the user's role from the token's `role` claim, as Login issues it.
export const ACCESS_TOKEN_COOKIE = 'accessToken';

export interface SeededUser {
  /** `users.id` in init-test.sql (claim `sub`). */
  id: string;
  /** Role Login would put in the token (claim `role`). */
  role: 'Admin' | 'Maire' | 'Responsable' | 'User' | 'Guest';
}

const JWT_SECRET = process.env.E2E_JWT_SECRET ?? 'b"secret"';

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

/** HS256 JWT accepted by Core API / BFF User (claims sub + role + exp). */
export function mintAccessToken(user: SeededUser, ttlSeconds = 3600) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ sub: user.id, role: user.role, exp: now + ttlSeconds }));
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
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
