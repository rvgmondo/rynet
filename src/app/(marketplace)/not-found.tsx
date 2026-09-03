import { Search } from "lucide-react";
import Link from "next/link";

/**
 * The 404.
 *
 * A search box rather than an apology. Most people who land here mistyped a URL or followed
 * a link to a listing that has since been archived, and in both cases what they want is to
 * find the car, not to read that we are sorry.
 *
 * A real GET form to /cars, so it works before hydration and with JavaScript off.
 */
export default function NotFound() {
  return (
    <div className="container-page py-[var(--section-loose)]">
      <div className="measure">
        <p className="font-display text-sm font-bold uppercase tracking-[var(--tracking-widest)] text-accent">
          404
        </p>
        <h1 className="mt-3 text-4xl">This page is not here</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Either the address is wrong, or the listing has been taken down. Sold vehicles stay up for
          ninety days, so if it is older than that it has been archived.
        </p>

        <form method="get" action="/cars" className="mt-8">
          <label htmlFor="nf-search" className="block text-sm font-medium">
            Search the stock instead
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="nf-search"
              name="q"
              type="search"
              placeholder="Hilux, Polo, bakkie"
              className="min-h-11 flex-1 rounded-md border border-line-interactive bg-surface px-3 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-4 text-sm font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
            >
              <Search aria-hidden="true" className="size-4" />
              Search
            </button>
          </div>
        </form>

        <nav aria-label="Useful links" className="mt-10">
          <h2 className="text-sm font-bold">Or try one of these</h2>
          <ul className="mt-3 space-y-1 text-sm">
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
                  className="flex min-h-11 items-center font-semibold text-accent hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
