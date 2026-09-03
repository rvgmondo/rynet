import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Pagination.
 *
 * Real anchors, never click handlers, because Section 13 requires crawlable links and a
 * button that changes state via JavaScript is invisible to a crawler and unreachable for
 * anyone who lands on the page before the JavaScript does.
 *
 * `rel="prev"` and `rel="next"` are set on the adjacent pages. Google no longer uses them
 * as an indexing signal, but other crawlers and assistive technology still do, and they
 * cost nothing.
 *
 * Every page in the window is a numbered link with its own accessible name, so a screen
 * reader user hears "Page 4 of 13" rather than "link, 4". The current page is marked with
 * `aria-current="page"` and rendered as text, not a link to itself.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // A sliding window of five, clamped to the ends, plus first and last always reachable.
  const window = 2;
  const start = Math.max(1, Math.min(page - window, totalPages - window * 2));
  const end = Math.min(totalPages, Math.max(page + window, window * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  const linkClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-semibold tabular transition-colors duration-[var(--duration-micro)]";

  return (
    <nav aria-label="Search results pages" className="mt-8 border-t border-line pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              rel="prev"
              className={`${linkClass} border border-line-interactive hover:bg-surface-sunken`}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span className="ml-1 hidden sm:inline">Previous</span>
              <span className="sr-only sm:hidden">Previous page</span>
            </Link>
          ) : (
            <span className={`${linkClass} border border-line text-ink-muted`} aria-hidden="true">
              <ChevronLeft className="size-4" />
              <span className="ml-1 hidden sm:inline">Previous</span>
            </span>
          )}
        </li>

        {start > 1 ? (
          <>
            <li>
              <Link
                href={buildHref(1)}
                aria-label="Page 1"
                className={`${linkClass} hover:bg-surface-sunken`}
              >
                1
              </Link>
            </li>
            {start > 2 ? (
              <li aria-hidden="true" className="px-1 text-ink-muted">
                ...
              </li>
            ) : null}
          </>
        ) : null}

        {pages.map((p) =>
          p === page ? (
            <li key={p}>
              <span
                aria-current="page"
                className={`${linkClass} bg-accent-solid text-ink-on-accent`}
              >
                <span className="sr-only">Page </span>
                {p}
                <span className="sr-only">, current page</span>
              </span>
            </li>
          ) : (
            <li key={p}>
              <Link
                href={buildHref(p)}
                aria-label={`Page ${p}`}
                rel={p === page - 1 ? "prev" : p === page + 1 ? "next" : undefined}
                className={`${linkClass} hover:bg-surface-sunken`}
              >
                {p}
              </Link>
            </li>
          ),
        )}

        {end < totalPages ? (
          <>
            {end < totalPages - 1 ? (
              <li aria-hidden="true" className="px-1 text-ink-muted">
                ...
              </li>
            ) : null}
            <li>
              <Link
                href={buildHref(totalPages)}
                aria-label={`Page ${totalPages}`}
                className={`${linkClass} hover:bg-surface-sunken`}
              >
                {totalPages}
              </Link>
            </li>
          </>
        ) : null}

        <li>
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              rel="next"
              className={`${linkClass} border border-line-interactive hover:bg-surface-sunken`}
            >
              <span className="mr-1 hidden sm:inline">Next</span>
              <span className="sr-only sm:hidden">Next page</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span className={`${linkClass} border border-line text-ink-muted`} aria-hidden="true">
              <span className="mr-1 hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
