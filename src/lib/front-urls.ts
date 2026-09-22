// Public URL of every Mairie360 front, injected at runtime by the Helm chart
// (charts/Fronts `fronts.commonEnv`). They must never be inlined at build time:
// one image is promoted from dev to staging and prod.
export const FRONT_URL_KEYS = [
  "LOGIN_FRONT_URL",
  "DASHBOARD_FRONT_URL",
  "PROJECT_FRONT_URL",
  "CALENDAR_FRONT_URL",
  "MESSAGE_FRONT_URL",
  "ELEARNING_FRONT_URL",
  "SETTINGS_FRONT_URL",
  "ADMINISTRATION_FRONT_URL",
  "EMAIL_FRONT_URL",
  "FILES_FRONT_URL",
] as const;

export type FrontUrlKey = (typeof FRONT_URL_KEYS)[number];
export type FrontUrls = Partial<Record<FrontUrlKey, string>>;

let browserFrontUrls: FrontUrls = {};

/** Server only: reads the front URLs from the runtime environment. */
export function readFrontUrlsFromEnv(): FrontUrls {
  const urls: FrontUrls = {};
  for (const key of FRONT_URL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) urls[key] = value;
  }
  return urls;
}

/** Called by FrontUrlsProvider with the values the root layout read on the server. */
export function setBrowserFrontUrls(urls: FrontUrls) {
  browserFrontUrls = urls;
}

/**
 * Resolves a front URL when it is used, never at module load: on the server it is
 * read from the environment, in the browser from what the root layout sent.
 */
export function frontUrl(key: FrontUrlKey): string | undefined {
  return typeof window === "undefined" ? readFrontUrlsFromEnv()[key] : browserFrontUrls[key];
}
