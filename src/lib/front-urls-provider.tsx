"use client";

import type { ReactNode } from "react";
import { setBrowserFrontUrls, type FrontUrls } from "./front-urls";

// Stores the URLs before any child renders, so navigation helpers called during
// render or on click see the runtime values of this instance.
export function FrontUrlsProvider({ urls, children }: { urls: FrontUrls; children: ReactNode }) {
  if (typeof window !== "undefined") setBrowserFrontUrls(urls);
  return children;
}
