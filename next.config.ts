import type { NextConfig } from "next";

const devFrontUrl = (subdomain: string) => `https://${subdomain}.dev.mairie360-eip.fr/`;

// En-têtes posés sur toutes les réponses (pages, assets, routes relayées).
// La Content-Security-Policy dépend d'un nonce par requête : elle est posée par src/middleware.ts.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Toutes les ressources de la page sont servies par cette origine.
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  env: {
    LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL ?? devFrontUrl("login"),
    EMAIL_FRONT_URL: process.env.EMAIL_FRONT_URL ?? devFrontUrl("email"),
    PROJECT_FRONT_URL: process.env.PROJECT_FRONT_URL ?? devFrontUrl("project"),
    CALENDAR_FRONT_URL: process.env.CALENDAR_FRONT_URL ?? devFrontUrl("calendar"),
    FILES_FRONT_URL: process.env.FILES_FRONT_URL ?? devFrontUrl("files"),
    MESSAGE_FRONT_URL: process.env.MESSAGE_FRONT_URL ?? devFrontUrl("message"),
    ELEARNING_FRONT_URL: process.env.ELEARNING_FRONT_URL ?? devFrontUrl("elearning"),
    ADMINISTRATION_FRONT_URL: process.env.ADMINISTRATION_FRONT_URL ?? devFrontUrl("admin"),
  },
};

export default nextConfig;
