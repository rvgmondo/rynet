import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { AgencyFooter } from "@/components/agency/agency-footer";
import { AgencyHeader } from "@/components/agency/agency-header";
import { SkipLink } from "@/components/layout/skip-link";

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
 * The fonts are declared again because each root layout owns its own `<html>`, so the CSS
 * variables have to be applied here too. next/font deduplicates the actual files.
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
    { media: "(prefers-color-scheme: dark)", color: "#001123" },
  ],
};

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-ZA"
      suppressHydrationWarning
      className={`${montserrat.variable} ${inter.variable}`}
    >
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
