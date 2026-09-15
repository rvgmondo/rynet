import { ArrowRight, CarFront } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button-classes";
import { relName } from "@/lib/relations";
import { MAX_DEALERSHIPS } from "@/lib/sell-to-dealer-schema";
import type { Dealer } from "@/payload-types";

import { joinNames } from "./names";

/**
 * The closing band on a dealership page, for the reader who came to sell rather than buy.
 *
 * WORDING. The link says "Sell your car to a dealership", not "to this dealership". The form at
 * /sell-to-a-dealer sends one description to up to MAX_DEALERSHIPS dealerships in the seller's
 * province that buy that kind of car; it cannot be pointed at one dealership, so promising that
 * this one will see it would be untrue.
 *
 * HONESTY. Only a real dealership that accepts trade-ins is named as a buyer, with the makes it
 * has told Rynet it wants. A demonstration dealership gets the general sentence and nothing that
 * suggests it will make an offer, because it will not.
 *
 * No rand figure appears here, the same rule as the page it links to.
 */
export function SellToDealerBand({ dealer }: { dealer: Dealer }) {
  const buysMakes = (dealer.buysMakes ?? [])
    .map((make) => relName(make))
    .filter((name): name is string => Boolean(name));
  const namesThisDealer = !dealer.isDemonstration && Boolean(dealer.acceptsTradeIns);

  return (
    <section aria-labelledby="sell-heading" className="container-page pb-[var(--section-base)]">
      <div className="rn-panel flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-10">
        <div className="flex max-w-2xl gap-4 sm:gap-5">
          <span aria-hidden="true" className="rn-icon-tile rn-icon-tile--lg">
            <CarFront className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 id="sell-heading" className="rn-h3">
              Selling a car?
            </h2>
            <p className="mt-2 text-base text-body">
              {namesThisDealer
                ? `${dealer.tradingName} buys cars through Rynet${buysMakes.length > 0 ? `, and is looking for ${joinNames(buysMakes)}` : ""}. `
                : null}
              Describe your car once, and up to {MAX_DEALERSHIPS} dealerships in your province that
              buy that kind of car can make you an offer. There is nothing to sign and no
              obligation.
            </p>
          </div>
        </div>

        <Link
          href="/sell-to-a-dealer"
          className={buttonClasses({
            variant: "primary",
            size: "lg",
            block: "mobile",
            className: "shrink-0",
          })}
        >
          Sell your car to a dealership
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
