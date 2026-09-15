import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button-classes";

/**
 * Pagination: Previous and Next at the ends, numbered pills between.
 *
 * Real anchors, never click handlers, because crawlers follow links and a buyer who lands before
 * the JavaScript does still needs page two. Every link carries the whole search (the caller's
 * `buildHref` does that), because a page two that drops the filters is the most common bug on a
 * faceted site, and e2e/smoke.spec.ts asserts `a[rel="next"]` keeps them.
 *
 * Each number has its own accessible name ("Page 4"), and the current page is text marked
 * `aria-current="page"`, not a link to itself. The current pill is navy rather than red: red is
 * spent on the one action that matters on a screen, and "you are on page one" is not it.
 *
 * On a phone the numbers give way to "Page 2 of 13" between the two buttons. Nobody jumps to page
 * nine with a thumb; they press Next, and seven pills across 390px would wrap into a row nobody can
 * follow.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  label = "Search results pages",
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  // A sliding window of five, clamped to the ends, with the first and last always reachable.
  const reach = 2;
  const start = Math.max(1, Math.min(page - reach, totalPages - reach * 2));
  const end = Math.min(totalPages, Math.max(page + reach, reach * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  const pill =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-base font-semibold tabular";
  const numberClass = `${pill} text-heading transition-colors duration-[var(--duration-micro)] hover:bg-subtle-hover`;
  const gap = (
    <li aria-hidden="true" className="inline-flex min-w-8 items-center justify-center text-muted">
      <Ellipsis className="size-4" />
    </li>
  );

  const end_ = (direction: "prev" | "next") => {
    const target = direction === "prev" ? page - 1 : page + 1;
    const available = direction === "prev" ? page > 1 : page < totalPages;
    // Below 384px the words go and the chevrons stay, so both ends and "Page 2 of 13" fit a 320px
    // screen. The words stay in the accessible name.
    const content =
      direction === "prev" ? (
        <>
          <ChevronLeft aria-hidden="true" />
          <span className="max-[24rem]:sr-only">Previous</span>
        </>
      ) : (
        <>
          <span className="max-[24rem]:sr-only">Next</span>
          <ChevronRight aria-hidden="true" />
        </>
      );
    const classes = buttonClasses({ variant: "outline", size: "sm", className: "shrink-0" });

    return available ? (
      <Link href={buildHref(target)} rel={direction} className={classes}>
        {content}
      </Link>
    ) : (
      /* Held in place rather than removed, so the row does not shift on the first and last page. */
      <span aria-hidden="true" className={`${classes} pointer-events-none border-line text-muted`}>
        {content}
      </span>
    );
  };

  return (
    <nav aria-label={label} className="mt-10 border-t border-line pt-6 sm:mt-12">
      <div className="flex items-center justify-between gap-3">
        {end_("prev")}

        <p className="text-sm text-body sm:hidden">
          Page <span className="font-semibold text-heading tabular">{page}</span> of{" "}
          <span className="font-semibold text-heading tabular">{totalPages}</span>
        </p>

        <ul className="hidden items-center gap-1 sm:flex">
          {start > 1 ? (
            <>
              <li>
                <Link href={buildHref(1)} aria-label="Page 1" className={numberClass}>
                  1
                </Link>
              </li>
              {start > 2 ? gap : null}
            </>
          ) : null}

          {pages.map((p) => (
            <li key={p}>
              {p === page ? (
                <span aria-current="page" className={`${pill} bg-secondary text-on-secondary`}>
                  <span className="sr-only">Page </span>
                  {p}
                </span>
              ) : (
                <Link href={buildHref(p)} aria-label={`Page ${p}`} className={numberClass}>
                  {p}
                </Link>
              )}
            </li>
          ))}

          {end < totalPages ? (
            <>
              {end < totalPages - 1 ? gap : null}
              <li>
                <Link
                  href={buildHref(totalPages)}
                  aria-label={`Page ${totalPages}`}
                  className={numberClass}
                >
                  {totalPages}
                </Link>
              </li>
            </>
          ) : null}
        </ul>

        {end_("next")}
      </div>
    </nav>
  );
}
