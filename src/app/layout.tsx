import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "New Eden Companion",
  description: "Local EVE Online dashboard, preflight checker, and planning tools.",
  applicationName: "New Eden Companion",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b1116",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
