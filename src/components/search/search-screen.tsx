import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import type { Crumb } from "@/components/layout/breadcrumbs";
import { FacetRail } from "@/components/vehicles/facet-rail";
import { ResultsGrid } from "@/components/vehicles/results-grid";
import { ResultsHeader } from "@/components/vehicles/results-header";

import { AppliedFilters, buildChips } from "./applied-filters";
import { DemoNotice } from "./demo-notice";
import { FiltersButton } from "./filters-button";
import { SortControl } from "./sort-control";
import { PER_PAGE, type SearchRun } from "./stock";

/**
 * A results page, shared by /cars and every landing page under it, so the two can never drift
 * into looking or behaving differently.
 *
 * DOCUMENT ORDER IS READING ORDER AT EVERY WIDTH: heading and count, the filters, then the results.
 * At 1280px the filters are a sticky white sidebar beside the results. Below it they are a sheet
 * that is out of the layout until opened, so a phone shows the heading, one line of chips, a
 * sticky "Filters" and "Sort" bar, the demonstration notice and then the first photograph, inside
 * the first screen. The audit measured the first photograph 556px down on /cars and 653px down on a
 * landing page; this layout puts it at roughly 350 to 450px.
 *
 * The sticky bar's wrapper is `display: contents` below 1280px so the bar sticks for the whole
 * length of the results rather than only inside its own row. The bar carries the count in small
 * type beside Filters, so a buyer three thousand pixels down still knows how big the set is.
 *
 * AT 1280px the filters run down the left from the top of the page, and the heading, the count and
 * the sort order share one row above the results, the way the big marketplaces lay it out. The DOM
 * order does not change: heading, filters, results, each placed in the grid. The desktop sort is
 * its own small form (the phone one lives in the sticky bar and is not drawn at that width), so
 * only one of the two is ever rendered visible.
 */
export function SearchScreen({
  run,
  heading,
  trail,
  intro,
  sortAction,
  sortCarried,
  buildHref,
  extra = [],
  empty,
  related,
}: {
  run: SearchRun;
  heading: string;
  trail?: Crumb[];
  intro?: ReactNode;
  /** Where the sort form goes: /cars, or the landing page's own path. */
  sortAction: string;
  /** Everything the sort form must carry besides `sort`. */
  sortCarried: [string, string][];
  buildHref: (page: number) => string;
  /** Parameters this page does not understand, carried through the filter form untouched. */
  extra?: [string, string][];
  empty: { title: string; body: string; href: string; action: string };
  related?: ReactNode;
}) {
  const chips = buildChips(run.resolved, run.taxonomy);
  const { query, widened, filters, effective } = run.resolved;

  return (
    <div className="container-page pt-6 pb-[var(--section-base)] sm:pt-8 xl:grid xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:gap-x-8 xl:pt-10">
      <div className="xl:col-start-2 xl:row-start-1 xl:flex xl:items-end xl:justify-between xl:gap-6">
        <ResultsHeader
          heading={heading}
          trail={trail}
          intro={intro}
          total={run.total}
          demo={run.demo}
          page={run.page}
          totalPages={run.totalPages}
          perPage={PER_PAGE}
        />
        <div className="hidden shrink-0 xl:block">
          <SortControl
            key={`desk|${effective.sort}|${JSON.stringify(sortCarried)}`}
            id="sort-desk"
            action={sortAction}
            sort={effective.sort}
            carried={sortCarried}
          />
        </div>
      </div>

      <div className="mt-5 xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:mt-0">
        <FacetRail set={run} total={run.total} applied={chips.length} extra={extra} />
      </div>

      <div className="min-w-0 xl:col-start-2 xl:row-start-2 xl:mt-6">
        <section id="results" aria-labelledby="results-heading" className="min-w-0">
          <AppliedFilters chips={chips} className="mb-2 xl:mb-5" />

          <div
            data-sticky-toolbar
            className="sticky top-[var(--header-height)] z-[var(--z-sticky)] -mx-[var(--container-pad)] mb-4 flex items-center gap-2 border-b border-line bg-page px-[var(--container-pad)] py-2 xl:hidden"
          >
            <FiltersButton count={chips.length} className="shrink-0" />
            {/*
              One line, never three: the heading above already says what kind of listings these
              are, and every card carries its own Demo listing badge, so the bar only keeps count.
            */}
            <p
              aria-hidden="true"
              className="shrink-0 text-[0.8125rem] whitespace-nowrap text-muted max-[22rem]:hidden"
            >
              <span className="font-semibold text-heading tabular">
                {run.total.toLocaleString("en-ZA")}
              </span>{" "}
              {run.total === 1 ? "result" : "results"}
            </p>
            <SortControl
              key={`${effective.sort}|${JSON.stringify(sortCarried)}`}
              action={sortAction}
              sort={effective.sort}
              carried={sortCarried}
              className="ms-auto min-w-0 flex-1 justify-end"
            />
          </div>

          {query && !filters.nothing ? (
            <p className="mb-4 text-sm text-body">
              Showing results for{" "}
              <span className="font-semibold text-heading">&ldquo;{query.text}&rdquo;</span>.
              {query.unmatched.length > 0 ? (
                <>
                  {" "}
                  Nothing on Rynet matched{" "}
                  <span className="font-semibold text-heading">
                    &ldquo;{query.unmatched.join(" ")}&rdquo;
                  </span>
                  , so that part was left out.
                </>
              ) : null}
            </p>
          ) : null}

          {widened ? (
            <p className="mb-4 flex items-start gap-2 text-sm text-body">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
              <span>
                Nothing is listed in {widened.from}, so these are the cars across {widened.to}.
              </span>
            </p>
          ) : null}

          <DemoNotice total={run.total} demo={run.demo} className="mb-5 xl:mb-6" />

          <ResultsGrid
            vehicles={run.cards}
            page={run.page}
            totalPages={run.totalPages}
            buildHref={buildHref}
            emptyTitle={empty.title}
            emptyBody={empty.body}
            emptyHref={empty.href}
            emptyAction={empty.action}
          />
        </section>

        {related}
      </div>
    </div>
  );
}
