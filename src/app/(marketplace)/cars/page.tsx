import type { Metadata } from "next";

import {
  carriedPairs,
  hrefFor,
  KNOWN_KEYS,
  type RawParams,
  readState,
} from "@/components/search/params";
import { SearchScreen } from "@/components/search/search-screen";
import { runSearch } from "@/components/search/stock";
import { safePage } from "@/lib/search";

export const metadata: Metadata = {
  title: "Cars for sale",
  description:
    "Search used, new and ex-demo cars listed by South African dealerships. Filter by price, make, model, body type, year, mileage and province. Every dealership is checked before it can list, and there are no private sellers.",
  /*
   * Every query variant of this page canonicalises to /cars.
   *
   * There was no canonical at all, so ?q=, ?colour=, ?sort= and every combination of facets
   * each declared itself the original of a page with the same cars on it. robots.txt already
   * asks crawlers not to fetch /cars?, but a canonical is what consolidates the ones that arrive
   * anyway, from a share or a link. The landing pages under /cars/body/, /cars/fuel/ and
   * /cars/in/ set their own canonicals and are unaffected.
   */
  alternates: { canonical: "/cars" },
};

type SearchParams = Promise<RawParams>;

/**
 * Search.
 *
 * Server rendered, deliberately. Every indexable route ships full HTML, and search is the most
 * valuable one on the platform; a client-side skeleton that a crawler sees as empty would throw
 * that away.
 *
 * Filter state lives entirely in the URL, which is what makes a result set shareable, restorable
 * and crawlable. There is no client state store holding what the buyer filtered by. A GET form
 * with JavaScript off reaches every filter, the sort order and every page.
 *
 * What the URL can say: `q` (the search box), `make`, `model`, `body`, `fuel`, `transmission` and
 * `province` (each repeatable, so Toyota and Ford can be chosen together), `city`, `colour`,
 * `variant`, `condition`, `minPrice`, `maxPrice`, `minYear`, `maxYear`, `maxMileage`, `sort` and
 * `page`. Single values, which is all any older link or the home page search produces, read
 * exactly as they always did. The rules that turn them into a result set, the counts and the
 * order are in src/components/search/ and are unit tested there.
 */
export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const state = readState(params);

  // Clamped at both ends (see safePage): a page number past the safe integer range once reached
  // SQLite as an offset and this route answered 500. Past the last page shows the last page.
  const run = await runSearch(
    state,
    safePage(Array.isArray(params.page) ? params.page[0] : params.page),
  );

  /*
   * Page links carry every parameter the buyer arrived with except the page itself, repeated
   * values included. Without this page two drops the filters and dumps the buyer back into the
   * whole catalogue, which is the most common pagination bug on a faceted site.
   */
  const keep = carriedPairs(params, ["page"]);
  const buildHref = (target: number) =>
    hrefFor("/cars", target > 1 ? [...keep, ["page", String(target)]] : keep);

  // The sort form carries everything except sort and page, the search box's words included, since
  // sorting changes the order and nothing else.
  const sortCarried = carriedPairs(params, ["sort", "page"]);

  // Parameters this page does not know (a campaign tag on a shared link) ride through the filters.
  const extra = carriedPairs(
    Object.fromEntries(Object.entries(params).filter(([key]) => !KNOWN_KEYS.has(key))),
    [],
  );

  const nothingUnderstood = run.resolved.filters.nothing && run.resolved.query;

  return (
    <SearchScreen
      run={run}
      heading="Cars for sale"
      sortAction="/cars"
      sortCarried={sortCarried}
      buildHref={buildHref}
      extra={extra}
      empty={
        nothingUnderstood
          ? {
              title: `Nothing matched “${run.resolved.query?.text ?? ""}”`,
              body: "Try a make, a model, a body type or a town, such as Hilux, bakkie or Pretoria.",
              href: "/cars",
              action: "See all cars",
            }
          : {
              title: "No cars match that combination",
              body: "Nothing listed fits every filter you have set at once. Widening the price range, the year or the province usually brings cars back.",
              href: "/cars",
              action: "Clear all filters",
            }
      }
    />
  );
}
