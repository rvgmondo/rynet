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
 *
 * REDRAWN. It was the one un-redrawn control left in the results surface: a row of small
 * bordered boxes with a red fill on the current page and two chevron glyphs, centred. Three
 * things were wrong with it and they are the same three the redesign exists to fix. The boxes
 * are boxes. The red fill put a second red object in a viewport that already has one, and spent
 * the loudest mark on the site on saying "you are on page one", which is the least useful fact
 * on the screen. And the whole control was centred, on a page where everything else is ranged
 * left against a rule.
 *
 * So it is a ruled bar now. Previous and Next hold the two ends, where a thumb and a cursor both
 * expect them. The numbers sit in the middle at the tabular width the prices use, and the
 * current one is stated in ink under a 2px rule rather than filled: the same ink-flip logic as
 * every other selected thing on the site, drawn as an underline because a filled number in a row
 * of numbers reads as a button.
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

  /** A number in the row. A line, never a box. */
  const numberClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-sm font-semibold tabular text-ink-secondary transition-colors duration-[var(--duration-micro)] hover:text-ink";

  /** The two ends. These are the only two targets most people ever press. */
  const endClass =
    "rn-label inline-flex min-h-11 items-center px-4 transition-colors duration-[var(--duration-micro)]";

  return (
    <nav aria-label="Search results pages" className="mt-10 border-t-2 border-ink">
      <div className="flex items-center justify-between gap-4 pt-4">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            rel="prev"
            className={`${endClass} border border-line-interactive hover:bg-ink hover:text-ink-inverse`}
          >
            Previous
          </Link>
        ) : (
          /* Held rather than hidden, so the numbers do not jump sideways on page one. */
          <span className={`${endClass} border border-line text-ink-muted`} aria-hidden="true">
            Previous
          </span>
        )}

        {/*
          On a phone the numbers go and the position stays.
          -------------------------------------------------
          Previous, seven numerals and Next do not fit across 390px, and flex-wrap made a mess of
          it: the row broke into three lines and read "1 2 3 / 4 5 ... / 13", which is not an
          order anybody can follow. Nobody jumps to page nine on a phone anyway. They press Next.
          So the small screen gets the one fact it needs, and the numbers come back at 640px.
        */}
        <p className="rn-label text-ink-secondary sm:hidden">
          Page <span className="tabular text-ink">{page}</span> of{" "}
          <span className="tabular text-ink">{totalPages}</span>
        </p>

        <ul className="hidden items-center justify-center gap-x-1 sm:flex">
          {start > 1 ? (
            <>
              <li>
                <Link href={buildHref(1)} aria-label="Page 1" className={numberClass}>
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
                {/* The current page: ink, under a rule. The rest of the site marks a chosen
                    thing by flipping to ink, and this is that at the scale of one numeral. */}
                <span
                  aria-current="page"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 border-ink px-2 text-sm font-bold tabular text-ink"
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
                  className={numberClass}
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
                  className={numberClass}
                >
                  {totalPages}
                </Link>
              </li>
            </>
          ) : null}
        </ul>

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            rel="next"
            className={`${endClass} border border-line-interactive hover:bg-ink hover:text-ink-inverse`}
          >
            Next
          </Link>
        ) : (
          <span className={`${endClass} border border-line text-ink-muted`} aria-hidden="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
