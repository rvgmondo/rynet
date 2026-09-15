import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { displayFontUrl } from "@/lib/font-preload";
import { archivo } from "@/lib/fonts";

import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"),
  title: {
    default: "Rynet Showroom | Cars for sale from South African dealerships",
    template: "%s | Rynet Showroom",
  },
  description:
    "Cars for sale from South African dealerships only. Every dealership is checked before it can list, and there are no private sellers. Search stock across the country by make, model, price and area.",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Rynet Showroom",
  },
  /*
   * Large card rather than the imageless default.
   *
   * The image itself comes from opengraph-image.tsx, which Next wires up automatically for
   * every route in this group. Declaring the card type is the other half: without it a
   * shared link renders as a line of text with no picture, which is how every route on this
   * site was sharing.
   */
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never cap zoom. Pinch-zoom is an accessibility requirement, not a layout nuisance.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#112642" },
  ],
};

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
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
          <SiteHeader />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
