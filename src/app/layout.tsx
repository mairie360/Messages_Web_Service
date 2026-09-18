import type { Metadata } from "next";
import "./globals.css";
import "@mairie360/lib-components/dist/styles.css";
import "./app-shell.css";

// Rendu à la demande obligatoire : une page prérendue au build ne porterait pas le
// nonce CSP propre à chaque requête, et ses scripts seraient bloqués.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messagerie | Mairie360",
  description: "The Messages's module.",
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
      <body>{children}</body>
    </html>
  );
}
