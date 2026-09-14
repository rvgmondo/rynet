import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

import { NotFoundBody } from "@/components/layout/not-found-body";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { archivo } from "@/lib/fonts";

import "@/styles/globals.css";

/**
 * The GLOBAL not-found.
 *
 * Both root layouts are scoped to a route group, and a route group's layout does not wrap the
 * global not-found, so any path that matches neither group (every typo above the first segment)
 * is served by this file, which therefore owns its own <html> and <body>.
 *
 * It renders the marketplace chrome around the same body as `(marketplace)/not-found.tsx`, so a
 * mistyped address, which is often a visitor's first sight of the site, looks like the site.
 * `suppressHydrationWarning` and the ThemeProvider match the layouts: next-themes stamps
 * data-theme before React hydrates, and the theme switch in the footer needs the provider. Before
 * hydration tokens.css still follows the operating system.
 */
export const metadata: Metadata = {
  title: "Page not found | Rynet",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="en-ZA" suppressHydrationWarning className={archivo.variable}>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <SkipLink />
          <SiteHeader />
          <main id="main" tabIndex={-1}>
            <NotFoundBody />
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
