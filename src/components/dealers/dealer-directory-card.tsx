import { ArrowRight, Car, MapPin } from "lucide-react";
import Link from "next/link";

import { DealershipStatusBadge } from "@/components/ui/badge";
import { formatRand } from "@/lib/format";

import { DealerMonogram } from "./dealer-monogram";
import { carsCount, makesSummary } from "./names";

export type DirectoryDealer = {
  id: number;
  slug: string;
  tradingName: string;
  isDemonstration: boolean;
  foundedYear: number | null;
  /** "Pretoria, Gauteng", from the primary branch. */
  location: string | null;
  branchCount: number;
  stockCount: number;
  /** Makes in live stock, most listed first. Never the franchise list. */
  makes: string[];
  minPrice: number | null;
  maxPrice: number | null;
};

/**
 * One dealership in the directory.
 *
 * A white card with the dealership's monogram, its status badge, name and town, what it stocks,
 * and two figures along the foot. The name link's ::after covers the card, so the whole card is
 * one target with one accessible name, and nothing else inside it is focusable.
 *
 * What tells two dealerships apart is taken from their live stock (the makes, the count and the
 * price range), never from the franchise field: printing "Toyota" from a franchise list would
 * present an invented business as an authorised dealer of a real brand.
 *
 * The status badge reads "Demo dealership" for a demonstration record and "Verified dealership"
 * only for a real one, through DealershipStatusBadge, which is the one place that decides it.
 */
export function DealerDirectoryCard({ dealer }: { dealer: DirectoryDealer }) {
  const makes = makesSummary(dealer.makes);
  const otherBranches = dealer.branchCount - 1;

  return (
    <article className="rn-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <DealerMonogram name={dealer.tradingName} />
        <DealershipStatusBadge isDemonstration={dealer.isDemonstration} />
      </div>

      <h3 className="mt-4 text-xl leading-snug font-semibold tracking-tight text-heading">
        <Link
          href={`/dealers/${dealer.slug}`}
          className="text-inherit no-underline transition-colors duration-[var(--duration-micro)] after:absolute after:inset-0 after:z-[1] after:rounded-md hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
        >
          {dealer.tradingName}
        </Link>
      </h3>

      {dealer.location ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {dealer.location}
            {otherBranches > 0
              ? `, and ${otherBranches} more ${otherBranches === 1 ? "branch" : "branches"}`
              : null}
          </span>
        </p>
      ) : null}

      {makes ? (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-body">
          <Car aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            <span className="sr-only">Makes in stock: </span>
            {makes}
          </span>
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <dl className="grid grid-cols-2 gap-x-4 border-t border-line pt-4">
          <div>
            <dt className="text-xs text-muted">In stock</dt>
            <dd className="mt-0.5 text-base font-semibold text-heading tabular">
              {dealer.stockCount === 0 ? "None right now" : carsCount(dealer.stockCount)}
            </dd>
          </div>
          {dealer.foundedYear ? (
            <div>
              <dt className="text-xs text-muted">Trading since</dt>
              <dd className="mt-0.5 text-base font-semibold text-heading tabular">
                {dealer.foundedYear}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          {dealer.minPrice !== null && dealer.maxPrice !== null ? (
            <p className="text-body tabular">
              <span className="sr-only">Prices from </span>
              {dealer.minPrice === dealer.maxPrice
                ? formatRand(dealer.minPrice)
                : `${formatRand(dealer.minPrice)} to ${formatRand(dealer.maxPrice)}`}
            </p>
          ) : (
            <span />
          )}
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 font-semibold text-accent"
          >
            View dealership
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
