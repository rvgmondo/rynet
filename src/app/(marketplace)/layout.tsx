import type { Metadata, Viewport } from "next";
import { Archivo, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";

import "@/styles/globals.css";

/**
 * Two families, and the second one exists to keep the first one honest.
 *
 * Archivo is a variable grotesque with a real WIDTH axis alongside weight, and that axis is
 * the whole typographic idea. At wdth 118 / wght 800 a headline fills a twelve column
 * measure edge to edge with no manual tracking hack; the same file at wdth 100 / wght 700
 * sets an eleven pixel uppercase label at 0.16em without turning to mush. One family, two
 * completely different registers. It also ships genuine tabular figures, which every price,
 * mileage and instalment on this platform depends on, and e2e/typography.spec.ts fails the
 * build if a subsetting change ever strips them.
 *
 * Newsreader does exactly one job: running prose. The verification explanation, dealership
 * descriptions, editorial. Never in a card, never in the search interface, never in a
 * button. This is the load-bearing decision, because a heavy expanded grotesk on its own is
 * what makes a brutal layout read as a student project. Students do not set body copy in an
 * optically sized serif.
 *
 * Both are self-hosted by next/font, which subsets them, serves them from our own origin
 * and writes a metric-matched fallback so the swap does not shift the layout.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  preload: true,
});

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  // Prose is below the fold on every page that has any, so it never blocks the first paint.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"),
  title: {
    default: "Rynet Showroom | Cars for sale from verified South African dealerships",
    template: "%s | Rynet Showroom",
  },
  description:
    "Every car on Rynet comes from a registered, verified dealership. No private sellers, ever. Search stock across South Africa by make, model, price, area and monthly instalment.",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Rynet Showroom",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never cap zoom. Pinch-zoom is an accessibility requirement, not a layout nuisance.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ededea" },
    { media: "(prefers-color-scheme: dark)", color: "#080d14" },
  ],
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-ZA"
      suppressHydrationWarning
      className={`${archivo.variable} ${newsreader.variable}`}
    >
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
