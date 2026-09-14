import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { AgencyFooter } from "@/components/agency/agency-footer";
import { AgencyHeader } from "@/components/agency/agency-header";
import { SkipLink } from "@/components/layout/skip-link";
import { displayFontUrl } from "@/lib/font-preload";
import { archivo } from "@/lib/fonts";

import "@/styles/globals.css";

/**
 * The agency front door.
 *
 * A separate route group with its own root layout, not a variant of the marketplace one.
 * The two share a domain, a design system and a company, and nothing else: different
 * audience, different navigation, different metadata, different Organization markup. A
 * dealer principal reading about stock feeds should never see a header offering to help
 * them find a bakkie.
 *
 * The font comes from src/lib/fonts.ts, applied again here because each root layout owns its
 * own <html>. next/font deduplicates the files.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"),
  title: {
    default: "Rynet Digital | Websites, stock feeds and advertising for car dealerships",
    template: "%s | Rynet Digital",
  },
  description:
    "We work with South African car dealerships and nobody else. Dealership websites, stock feeds, paid media, local search, photography, lead routing and reporting.",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Rynet Digital",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2139" },
  ],
};

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  /*
   * See lib/font-preload.ts. Next writes this link itself on a prerendered route and not on
   * a rendered-on-demand one, and the two busiest pages on this site are the second kind.
   */
  const displayFont = await displayFontUrl();

  return (
    <html lang="en-ZA" suppressHydrationWarning className={archivo.variable}>
      {/*
        A real element in a real head, not ReactDOM.preload.
        ------------------------------------------------------------------
        `preload()` was tried first and does nothing here, for the same reason next/font's
        own request does nothing here: on a route rendered on demand the hint travels in the
        flight payload and never becomes a tag the parser can act on. Which is the entire
        problem being fixed.

        On the routes Next DOES write a link for, this is a second tag with the same href.
        The browser issues one request for it, because a preload is deduplicated by URL and
        CORS mode, and `crossorigin=""` and `crossorigin="anonymous"` are the same mode.
      */}
      <head>
        {displayFont ? (
          <link
            rel="preload"
            href={displayFont}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <SkipLink />
          <AgencyHeader />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <AgencyFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
