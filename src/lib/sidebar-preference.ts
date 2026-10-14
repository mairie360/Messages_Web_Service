export const SIDEBAR_COOKIE = 'mairie360_sidebar';
const COLLAPSED = 'v1:collapsed';
const EXPANDED = 'v1:expanded';
let configuredDomain: string | undefined;

/** A UI preference may use the configured parent domain, never an unrelated host. */
export function validSidebarCookieDomain(value: string | undefined, hostname: string): string | undefined {
  const domain = value?.trim().toLowerCase().replace(/^\./, '');
  const host = hostname.toLowerCase();
  if (!domain || !/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z][a-z\d-]*[a-z\d]$/.test(domain)) return undefined;
  return host === domain || host.endsWith(`.${domain}`) ? domain : undefined;
}

export function configureSidebarCookieDomain(value: string | undefined) {
  configuredDomain = value;
}

export function readSidebarPreference(cookie: string): boolean {
  const value = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${SIDEBAR_COOKIE}=`))?.slice(SIDEBAR_COOKIE.length + 1);
  return value === COLLAPSED;
}

export function sidebarPreferenceCookie(collapsed: boolean, hostname: string, protocol: string, domain = configuredDomain): string {
  const parent = validSidebarCookieDomain(domain, hostname);
  return `${SIDEBAR_COOKIE}=${collapsed ? COLLAPSED : EXPANDED}; Path=/; Max-Age=31536000; SameSite=Lax${parent ? `; Domain=${parent}` : ''}${protocol === 'https:' ? '; Secure' : ''}`;
}
