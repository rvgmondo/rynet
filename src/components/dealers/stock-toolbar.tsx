import Link from "next/link";

import { SORT_OPTIONS } from "@/components/search/params";
import { SortControl } from "@/components/search/sort-control";

/** The same orderings, in the same words, as the search pages. */
export const STOCK_SORTS = SORT_OPTIONS;

export type BodyFacet = { slug: string; name: string; count: number };

/** The dealership's own address with its stock filters, dropping anything left at default. */
export function stockHref(
  slug: string,
  { body, sort, page }: { body?: string | null; sort?: string | null; page?: number },
): string {
  const params = new URLSearchParams();
  if (body) params.set("body", body);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/dealers/${slug}${query ? `?${query}` : ""}`;
}

/**
 * Narrowing one dealership's stock: body-type chips with counts, and a sort.
 *
 * The chips are links. The sort is the search pages' own control: a GET form that carries the body
 * type the buyer already chose as a hidden input, so sorting never quietly throws a filter away,
 * and that applies on choice with JavaScript and through a Sort button without it. Both return to
 * page one, because page three of a different ordering is a page of cars the buyer has not seen
 * the start of.
 */
export function StockToolbar({
  slug,
  total,
  bodies,
  body,
  sort,
}: {
  slug: string;
  total: number;
  bodies: BodyFacet[];
  body: string | null;
  sort: string;
}) {
  const chipBase = "rn-chip gap-1.5 min-h-11 sm:min-h-9";
  const active =
    "border-secondary bg-secondary text-on-secondary hover:border-secondary hover:bg-secondary-hover";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {bodies.length > 1 ? (
        /*
         * On a phone the chips run in one row that scrolls sideways, so a fourth body type does
         * not wrap onto a line of its own; the row bleeds to the screen edge and keeps the gutter
         * as padding. From 640px they wrap as before.
         */
        <nav aria-label="Filter this stock by body type" className="min-w-0">
          <ul className="mx-[calc(var(--container-pad)*-1)] flex gap-2 overflow-x-auto px-[var(--container-pad)] py-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <li>
              <Link
                href={stockHref(slug, { sort })}
                aria-current={body ? undefined : "true"}
                className={`${chipBase} ${body ? "" : active}`}
              >
                All
                <span className={`tabular ${body ? "text-muted" : ""}`}>{total}</span>
              </Link>
            </li>
            {bodies.map((facet) => {
              const selected = facet.slug === body;
              return (
                <li key={facet.slug}>
                  <Link
                    href={stockHref(slug, { body: facet.slug, sort })}
                    aria-current={selected ? "true" : undefined}
                    className={`${chipBase} ${selected ? active : ""}`}
                  >
                    {facet.name}
                    <span className={`tabular ${selected ? "" : "text-muted"}`}>{facet.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        <span />
      )}

      <SortControl
        action={`/dealers/${slug}`}
        sort={sort}
        carried={body ? [["body", body]] : []}
        id="stock-sort"
        className="lg:shrink-0"
      />
    </div>
  );
}
