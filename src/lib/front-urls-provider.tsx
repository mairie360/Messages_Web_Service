"use client";

import type { ReactNode } from "react";
import { setBrowserFrontUrls, type FrontUrls } from "./front-urls";
import { configureSidebarCookieDomain } from "./sidebar-preference";

// Stores the URLs before any child renders, so navigation helpers called during
// render or on click see the runtime values of this instance.
export function FrontUrlsProvider({ urls, cookieDomain, children }: { urls: FrontUrls; cookieDomain?: string; children: ReactNode }) {
  if (typeof window !== "undefined") { setBrowserFrontUrls(urls); configureSidebarCookieDomain(cookieDomain); }
  return children;
}
