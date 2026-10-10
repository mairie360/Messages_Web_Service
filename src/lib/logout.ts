import { frontUrl } from './front-urls';
import { parseFrontUrl } from './front-url';

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of ['mairie360.auth.jwt','mairie360.projects.jwt']) window.localStorage.removeItem(key);
  } catch { /* Storage can be unavailable without changing cookie ownership. */ }
}

const navigatingLocations = new WeakSet<Location>();
const logoutFlights = new WeakMap<Location, Promise<void>>();

/** A rejected renewal returns to Login without revoking or replaying a write. */
export function navigateToLogin() {
  if (typeof window === 'undefined') return false;
  if (navigatingLocations.has(window.location)) return true;
  const login = parseFrontUrl(frontUrl('LOGIN_FRONT_URL'));
  if (!login) return false;
  const own = parseFrontUrl(frontUrl('MESSAGE_FRONT_URL'));
  const current = parseFrontUrl(window.location.href);
  if (own && current?.origin === own.origin) login.searchParams.set('redirect', current.href);
  navigatingLocations.add(window.location);
  clearAuthStorage();
  window.location.assign(login.href);
  return true;
}

/** Cookies are expired by Login only after its revocation response is received. */
export async function logoutAndReload() {
  if (typeof window === 'undefined') return;
  const location = window.location;
  const running = logoutFlights.get(location);
  if (running) return running;
  const pending = (async () => {
    let response: Response;
    try {
      response = await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
    } catch {
      throw new Error('La déconnexion n’a pas abouti. Vérifiez votre connexion et réessayez.');
    }
    if (!response.ok) throw new Error('La déconnexion n’a pas abouti. Veuillez réessayer.');
    let receipt: unknown;
    try { receipt = await response.json(); } catch {
      throw new Error('La déconnexion n’a pas pu être confirmée. Veuillez réessayer.');
    }
    if (typeof receipt !== 'object' || receipt === null || !('session_revoked' in receipt) || typeof receipt.session_revoked !== 'boolean') {
      throw new Error('La déconnexion n’a pas pu être confirmée. Veuillez réessayer.');
    }
    if (!receipt.session_revoked) {
      clearAuthStorage();
      throw new Error('La session locale est fermée. La fermeture de la session serveur n’a pas pu être confirmée.');
    }
    let destination = parseFrontUrl(frontUrl('LOGIN_FRONT_URL'));
    if ('logout_url' in receipt) {
      if (typeof receipt.logout_url !== 'string') throw new Error('La destination de déconnexion est invalide.');
      const url = parseFrontUrl(receipt.logout_url);
      if (!url || url.protocol !== 'https:' || url.hash || !/^\/realms\/[^/]+\/protocol\/openid-connect\/logout$/.test(url.pathname)) {
        throw new Error('La destination de déconnexion est invalide.');
      }
      destination = url;
    }
    if (!destination) throw new Error('La connexion partagée n’est pas configurée.');
    clearAuthStorage();
    location.assign(destination.href);
  })();
  logoutFlights.set(location, pending);
  try { await pending; } finally { logoutFlights.delete(location); }
}
