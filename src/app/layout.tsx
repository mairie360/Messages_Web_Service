import type { Metadata } from "next";
import "./globals.css";
import "@mairie360/lib-components/dist/styles.css";
import "./app-shell.css";

export const metadata: Metadata = {
  title: "Messages",
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
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
