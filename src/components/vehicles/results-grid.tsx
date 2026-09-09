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
         happened, why, and gives the one action that actually helps. It is set at heading
         scale rather than body scale, so scarcity reads as editorial and not as an error. */
      <div className="border-y-2 border-ink py-16">
        <h2 className="rn-head max-w-[18ch]">{emptyTitle}</h2>
        <p className="rn-prose mt-4 text-ink-secondary">{emptyBody}</p>
        <Link
          href={emptyHref}
          className="mt-8 inline-flex min-h-11 items-center bg-accent-solid px-5 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          {emptyAction}
        </Link>
      </div>
    );
  }

  /*
   * The sparse-results rule. "Bakkie, diesel, automatic, Gauteng, under R400 000" is a query
   * a real buyer runs on their first visit, and on a design with no boxes and no photographs
   * three results in a four-up grid is close to a blank page. Below four, the grid goes
   * two-up at double plate height so the page still reads as deliberate.
   */
  const sparse = vehicles.length < 4;

  return (
    <>
      <ul className={`rn-grid ${sparse ? "rn-grid--sparse" : ""}`}>
        {vehicles.map((vehicle, index) => (
          <li key={vehicle.publicRef} className="flex">
            <VehicleCard vehicle={vehicle} index={index} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
