import type { FooterLegalLinks } from "@mairie360/lib-components/shell";
import { parseFrontUrl } from "@mairie360/lib-components/shared";

/** Instance details shown by the shared frame (MAIR-844), read at request time on the server. */
export type ShellInfo = {
  /** Commune name shown under « Commune de » next to the lib logo. */
  communeName?: string;
  /** Release shown in the footer. */
  version?: string;
};

type Env = Record<string, string | undefined>;

const clean = (value: string | undefined) => value?.trim() || undefined;

/** `COMMUNE_NAME` and `APP_VERSION` are optional: without them the lib keeps its own label and no version. */
export function readShellInfoFromEnv(env: Env = process.env): ShellInfo {
  return { communeName: clean(env.COMMUNE_NAME), version: clean(env.APP_VERSION) };
}

/** The legal notice and privacy policy are pages of the Login front (MAIR-292). */
export function legalLinksFor(loginUrl: string | undefined): FooterLegalLinks | undefined {
  const login = parseFrontUrl(loginUrl);
  if (!login) return undefined;
  return {
    legalNotice: new URL("mentions-legales", login).href,
    privacyPolicy: new URL("confidentialite", login).href,
  };
}
