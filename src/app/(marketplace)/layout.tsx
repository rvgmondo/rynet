import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";

import "@/styles/globals.css";

/**
 * Montserrat carries display, because it is the logo's own voice. Inter carries interface,
 * body and every numeral: this platform is mostly prices, mileage, kilowatts and rates, and
 * Inter has real tabular figures where a geometric display face does not.
 *
 * Both are self-hosted by next/font, which subsets them, serves them from our own origin and
 * writes a metric-matched fallback so the swap does not shift the layout.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#001123" },
  ],
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-ZA"
      suppressHydrationWarning
      className={`${montserrat.variable} ${inter.variable}`}
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
