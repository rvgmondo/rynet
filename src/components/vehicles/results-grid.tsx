import Link from "next/link";

import { Pagination } from "@/components/vehicles/pagination";
import { VehicleCard, type VehicleCardData } from "@/components/vehicles/vehicle-card";

/**
 * A page of results.
 *
 * Shared by /cars and every facet landing page under it, so the grid, the empty state and
 * the pagination behave identically wherever a buyer lands. A landing page that renders
 * results slightly differently from the search page is how a site starts to feel assembled
 * rather than built.
 */
export function ResultsGrid({
  vehicles,
  page,
  totalPages,
  buildHref,
  emptyTitle = "No cars match that combination",
  emptyBody = "Nothing on the platform fits every filter you have set at once. Widening the price range or removing the province usually brings results back.",
  emptyHref = "/cars",
  emptyAction = "See all stock",
}: {
  vehicles: VehicleCardData[];
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyHref?: string;
  emptyAction?: string;
}) {
  if (vehicles.length === 0) {
    return (
      /* An empty state is design work, not a div that says "no results". This one says what
         happened, why, and gives the one action that actually helps. */
      <div className="rounded-lg border border-line bg-surface-raised p-10 text-center">
        <h2 className="text-lg">{emptyTitle}</h2>
        <p className="measure mx-auto mt-2 text-sm text-ink-secondary">{emptyBody}</p>
        <Link
          href={emptyHref}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent-solid px-4 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          {emptyAction}
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => (
          <li key={vehicle.publicRef} className="flex">
            <VehicleCard vehicle={vehicle} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
