import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";

import "@/styles/globals.css";

/**
 * The GLOBAL not-found, which had no styling at all.
 *
 * Both root layouts on this site are scoped to a route group, `(marketplace)` and
 * `(agency)`, and a route group's layout does not wrap the global not-found. So any path
 * that matched neither group, which is every typo above the first segment, served Next's
 * built-in page: unstyled, no masthead, no way back, and on pure white in a light browser
 * and pure black in a dark one. The one page a lost visitor is guaranteed to reach was the
 * only page with no design on it.
 *
 * This file therefore owns its own `<html>` and `<body>`, because there is no layout above
 * it to provide them. It deliberately carries the minimum: one font rather than two, no
 * theme provider and no client JavaScript. Dark still works without any of that, because
 * tokens.css flips on `prefers-color-scheme` whenever no `data-theme` is stamped on the
 * root, which is exactly the state a page with no theme provider is in.
 *
 * The route-group 404s in `(marketplace)/not-found.tsx` and the agency's own are unchanged
 * and still handle everything inside those groups, with the full header and footer.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Page not found | Rynet",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="en-ZA" className={archivo.variable}>
      <body>
        <main className="container-page flex min-h-screen flex-col justify-center py-[var(--section-base)]">
          <p className="rn-label text-ink-muted">Rynet</p>

          <h1 className="rn-head mt-6 max-w-[16ch]">That address does not exist.</h1>

          <p className="rn-prose mt-5 text-ink-secondary">
            Nothing on Rynet answers to it. Either the link is wrong, or it pointed at something
            that has since been taken down.
          </p>

          {/* The rule carries `margin: 0` from .rn-rule, which beats a `mt-` utility of the same
              specificity depending on source order, so it was drawing flush through the
              paragraph above it. The gap goes on a wrapper, where nothing can reset it. */}
          <div className="mt-12">
            <hr className="rn-rule rn-rule--brand" />
          </div>

          <ul className="mt-8 flex flex-wrap gap-3">
            {[
              { href: "/", label: "Rynet Showroom" },
              { href: "/cars", label: "Cars for sale" },
              { href: "/dealers", label: "Dealerships" },
              { href: "/digital", label: "Rynet Digital" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rn-label inline-flex min-h-12 items-center border border-line-interactive px-5 hover:bg-ink hover:text-ink-inverse"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
