"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

/**
 * A compact search that follows the buyer off the home page, on wide screens.
 *
 * Hidden where a search already is the page (the home page and everything under /cars), so the
 * two never compete. A plain GET form to /cars with `name="q"`, so it works before hydration and
 * with scripting off, and costs the first paint nothing. Its own id, so it never duplicates the
 * home page's field.
 */
export function HeaderSearch({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/" || pathname === "/cars" || pathname.startsWith("/cars/")) return null;

  return (
    <search className={className}>
      <form method="get" action="/cars" className="relative">
        {/* Not "make, model...": a label containing "Make" is found by a screen reader's "go to
          field: Make" on the sell page, where the real Make field lives. */}
        <label htmlFor="header-q" className="sr-only">
          Search cars for sale
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          id="header-q"
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Search make or model"
          className="rn-input h-11 w-[16rem] bg-subtle pl-9 text-[0.9375rem] shadow-none"
        />
      </form>
    </search>
  );
}
