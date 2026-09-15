import type { ReactNode } from "react";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";

/**
 * The top of a result set: breadcrumbs where there is a parent, the page heading, the count, and
 * on a landing page one sentence of facts about the set.
 *
 * THE COUNT SITS DIRECTLY AFTER THE HEADING, AND NOT IN A LIVE REGION. A live region announces a
 * change inside a document that stays put, and every filter here loads a new document, so a region
 * would be created and read in the same paint and announce nothing. What tells a screen reader user
 * the number changed is the navigation itself; what has to be true is that the count is the very
 * next thing after the heading. e2e/smoke.spec.ts holds that (`h1#results-heading + p`).
 *
 * HONESTY. While a set is demonstration stock the count says "demo listings", not "cars", and it
 * never describes the dealerships as verified: the listings and the dealerships behind them are
 * example data. The platform rule (every dealership is checked before it can list) is copy for the
 * pages that explain how Rynet works, not a fact about seeded records.
 */
export function ResultsHeader({
  heading,
  total,
  demo,
  page,
  totalPages,
  perPage,
  trail,
  intro,
}: {
  heading: string;
  total: number;
  /** How many of `total` are demonstration listings. */
  demo: number;
  page: number;
  totalPages: number;
  perPage: number;
  /** Parents for the breadcrumb. /cars has none and shows none. */
  trail?: Crumb[];
  /** One sentence of facts about the set, on a landing page. */
  intro?: ReactNode;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const figure = total.toLocaleString("en-ZA");

  let noun: ReactNode;
  if (demo > 0 && demo === total) {
    noun = total === 1 ? "demo listing" : "demo listings";
  } else if (demo > 0) {
    noun = (
      <>
        {total === 1 ? "car" : "cars"}, {demo.toLocaleString("en-ZA")} of them demo listings
      </>
    );
  } else {
    noun = total === 1 ? "car" : "cars";
  }

  return (
    <header>
      {trail ? <Breadcrumbs trail={trail} className="mb-3" /> : null}
      <h1 id="results-heading" className="rn-h1 max-w-[24ch]">
        {heading}
      </h1>
      <p className="mt-2 text-base text-body">
        <strong className="font-semibold text-heading tabular">{figure}</strong> {noun}
        {totalPages > 1 ? (
          <span className="text-muted">
            , showing <span className="tabular">{from}</span> to{" "}
            <span className="tabular">{to}</span>
          </span>
        ) : null}
      </p>
      {intro ? <p className="mt-3 max-w-[68ch] text-base text-muted sm:text-lg">{intro}</p> : null}
    </header>
  );
}
