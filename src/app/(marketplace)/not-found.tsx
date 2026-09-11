import Link from "next/link";

import { HeroSearch } from "@/components/marketplace/hero-search";

/**
 * The 404.
 *
 * A search box rather than an apology. Most people who land here mistyped a URL or followed
 * a link to a listing that has since been archived, and in both cases what they want is to
 * find the car, not to read that we are sorry.
 *
 * A real GET form to /cars, so it works before hydration and with JavaScript off.
 *
 * REDRAWN. It hand-rolled its own boxed search input beside a second red button, under a red
 * "404" eyebrow, over five red links: seven red objects in one viewport on a palette whose one
 * rule is that there is never more than one. It is also the page most likely to be a visitor's
 * first impression, because it is where a stale link from anywhere puts them.
 *
 * The search is the home page's own control now rather than a second version of it. It is the
 * same GET form to /cars with the same `name="q"`, so this was a drop-in, and the two searches
 * on the site can no longer drift apart.
 */
export default function NotFound() {
  return (
    <div className="container-page py-[var(--section-loose)]">
      <p className="rn-label text-ink-muted">Error 404</p>
      <h1 className="rn-head mt-6 max-w-[14ch]">This page is not here</h1>
      <p className="rn-prose mt-5 text-ink-secondary">
        Either the address is wrong, or the listing has been taken down. Sold vehicles stay up for
        ninety days, so if it is older than that it has been archived.
      </p>

      <div className="mt-12">
        <hr className="rn-rule rn-rule--brand" />
      </div>

      <p className="rn-label mt-8 text-ink-muted">Search the stock instead</p>
      <HeroSearch className="mt-3 max-w-2xl" />

      <nav aria-label="Useful links" className="mt-14">
        <h2 className="rn-label text-ink-muted">Or try one of these</h2>
        <ul className="mt-4 max-w-2xl border-t border-line">
          {[
            { href: "/cars", label: "All stock, with filters" },
            { href: "/dealers", label: "Verified dealerships" },
            { href: "/cars/body/bakkie", label: "Bakkies" },
            { href: "/cars/body/suv", label: "SUVs" },
            { href: "/how-verification-works", label: "How verification works" },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rn-label flex min-h-12 items-center border-b border-line px-1 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
