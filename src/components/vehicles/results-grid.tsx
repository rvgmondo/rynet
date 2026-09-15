import Link from "next/link";

import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/vehicles/pagination";
import { VehicleCard, type VehicleCardData } from "@/components/vehicles/vehicle-card";

/**
 * A page of results.
 *
 * Shared by /cars and every facet landing page under it, and by a dealership's stock, so the
 * grid, the empty state and the pagination behave identically wherever a buyer lands.
 *
 * The grid is `.rn-grid` (globals.css): one card per row on a phone, two from 560px, three beside
 * the filter rail on a desktop, four on a full-width page. Each item skips layout until it is
 * scrolled to. Only the first card's photograph is preloaded, because it is the largest thing on
 * a phone's first screen and a page gets one priority image.
 */
export function ResultsGrid({
  vehicles,
  page,
  totalPages,
  buildHref,
  emptyTitle = "No cars match that combination",
  emptyBody = "Nothing on the platform fits every filter you have set at once. Widening the price range or removing the province usually brings results back.",
  emptyHref = "/cars",
  emptyAction = "See all cars",
  priorityFirst = true,
}: {
  vehicles: VehicleCardData[];
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyHref?: string;
  emptyAction?: string;
  /** Preload the first card's photograph. Turn off where something above the grid is the LCP. */
  priorityFirst?: boolean;
}) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        action={
          <Link href={emptyHref} className={buttonClasses({ variant: "primary" })}>
            {emptyAction}
          </Link>
        }
      >
        {emptyBody}
      </EmptyState>
    );
  }

  return (
    <>
      {/*
        The level between the page heading and the card titles. Every card title is an h3 and
        the page heading is an h1, and a skipped level fails axe's heading-order and reads as a
        missing section to a screen reader user. Hidden, because the heading above already says
        what the results are.
      */}
      <h2 className="sr-only">Matching cars</h2>
      <ul className="rn-grid">
        {vehicles.map((vehicle, index) => (
          <li key={vehicle.publicRef}>
            <VehicleCard vehicle={vehicle} priority={priorityFirst && index === 0} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
