import type { Metadata } from "next";
import { readFrontUrlsFromEnv } from "@/lib/front-urls";
import { FrontUrlsProvider } from "@/lib/front-urls-provider";
import "./globals.css";
import "@mairie360/lib-components/dist/styles.css";
import "./app-shell.css";

// Rendu à la demande obligatoire : une page prérendue au build ne porterait pas le
// nonce CSP propre à chaque requête, et ses scripts seraient bloqués.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messagerie | Mairie360",
  description: "Module de messagerie Mairie360.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=8dd52d5111b8", sizes: "192x192", type: "image/x-icon" },
      { url: "/mairie360-favicon.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/mairie360-logo.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="apple-mobile-web-app-title" content="Mairie360" />
      </head>
      <body><FrontUrlsProvider urls={readFrontUrlsFromEnv()}>{children}</FrontUrlsProvider></body>
    </html>
  );
}
