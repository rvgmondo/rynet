import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";

import { archivo } from "@/lib/fonts";

import "@/styles/globals.css";
import "@/styles/portal.css";

/**
 * The dealer portal: a dealership's own place on Rynet, at /portal.
 *
 * Its own root layout, like the agency's, because it shares the design system and nothing else
 * with the marketplace: no site header offering to find a bakkie, no footer, no search. It is a
 * workspace somebody signs in to.
 *
 * Never indexed. robots.txt disallows /portal as well, and the meta tag is the half that works on
 * a page a crawler reached some other way.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"),
  title: { default: "Rynet for dealerships", template: "%s | Rynet for dealerships" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#112642" },
  ],
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning className={archivo.variable}>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
