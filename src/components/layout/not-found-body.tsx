import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

import { RynetMark } from "@/components/brand/rynet-mark";
import { buttonClasses } from "@/components/ui/button-classes";

/*
 * Where a lost visitor most likely wanted to go. "Dealerships", not "Verified dealerships": every
 * dealership on the site today is demonstration data, and a claim in a link label is a claim.
 */
const USEFUL_LINKS = [
  { href: "/cars", label: "All cars for sale" },
  { href: "/cars/body/bakkie", label: "Bakkies" },
  { href: "/cars/body/suv", label: "SUVs" },
  { href: "/dealers", label: "Dealerships" },
  { href: "/how-verification-works", label: "How we verify dealerships" },
  { href: "/digital", label: "Rynet Digital, for dealerships" },
] as const;

/**
 * The body of both 404s: the route-group one and the global one, which renders the same header
 * and footer around it.
 *
 * A search rather than an apology. Most people who land here mistyped an address or followed a
 * link to a listing that has since been taken down, and what they want is the car. A real GET
 * form to /cars, so it works before hydration and with JavaScript off, with its own id.
 */
export function NotFoundBody() {
  return (
    <div className="container-narrow py-[var(--section-base)]">
      <div className="rn-panel px-5 py-10 text-center sm:px-12 sm:py-14">
        <RynetMark className="mx-auto h-12 w-auto" />
        <p className="rn-eyebrow mt-6">Error 404</p>
        <h1 className="rn-h1 mt-2">This page is not here</h1>
        <p className="rn-lead mx-auto mt-4 max-w-xl text-muted">
          The address may be mistyped, or the listing has been taken down. Search the cars for sale
          instead.
        </p>

        <search>
          <form
            method="get"
            action="/cars"
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="notfound-q" className="sr-only">
              Search cars for sale
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
              />
              <input
                id="notfound-q"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Make, model or body type"
                className="rn-input rn-input--lg pl-12"
              />
            </div>
            <button type="submit" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Search
            </button>
          </form>
        </search>
      </div>

      <nav aria-labelledby="useful-heading" className="mt-10">
        <h2 id="useful-heading" className="text-base font-semibold">
          Or try one of these
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {USEFUL_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rn-card rn-card--interactive flex-row items-center justify-between px-4 py-3.5 font-medium text-heading"
              >
                {link.label}
                <ArrowRight aria-hidden="true" className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
