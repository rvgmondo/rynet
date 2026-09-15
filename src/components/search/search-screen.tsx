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
 * length of the results rather than only inside its own row, and becomes one flex row with the
 * chips beside the sort control on a desktop.
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
    <div className="container-page pt-6 pb-[var(--section-base)] sm:pt-8 xl:pt-10">
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

      <div className="mt-5 xl:mt-8 xl:grid xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:gap-x-8">
        <FacetRail set={run} total={run.total} applied={chips.length} extra={extra} />

        <section id="results" aria-labelledby="results-heading" className="min-w-0">
          <div className="contents xl:mb-6 xl:flex xl:items-center xl:gap-4">
            <AppliedFilters chips={chips} className="mb-2 xl:mb-0 xl:min-w-0 xl:flex-1" />

            <div
              data-sticky-toolbar
              className="sticky top-[var(--header-height)] z-[var(--z-sticky)] -mx-[var(--container-pad)] mb-4 flex items-center gap-2 border-b border-line bg-page px-[var(--container-pad)] py-2 xl:static xl:z-auto xl:m-0 xl:ms-auto xl:shrink-0 xl:border-0 xl:bg-transparent xl:p-0"
            >
              <FiltersButton count={chips.length} className="shrink-0 xl:hidden" />
              <SortControl
                key={`${effective.sort}|${JSON.stringify(sortCarried)}`}
                action={sortAction}
                sort={effective.sort}
                carried={sortCarried}
                className="min-w-0 flex-1 justify-end xl:flex-none"
              />
            </div>
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
      </div>

      {related}
    </div>
  );
}
