import { BadgeCheck, Gauge, MapPin, TrendingDown } from "lucide-react";
import Link from "next/link";

import { formatKm, formatRand, priceDrop } from "@/lib/format";
import { vehicleUrl } from "@/lib/urls";

export type VehicleCardData = {
  publicRef: string;
  modelYear: number;
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  variantName: string | null;
  price: number;
  previousPrice: number | null;
  mileageKm: number;
  transmissionName: string | null;
  fuelName: string | null;
  bodyName: string | null;
  condition: "new" | "demo" | "pre_owned";
  dealerName: string;
  dealerSlug: string;
  cityName: string | null;
  provinceName: string | null;
  isDemonstration: boolean;
};

const CONDITION_LABEL: Record<VehicleCardData["condition"], string> = {
  new: "New",
  demo: "Demo",
  pre_owned: "Pre-owned",
};

/**
 * A vehicle in a result grid.
 *
 * Three decisions worth keeping.
 *
 * 1. **The whole card is not a link.** The title is. A card-sized anchor swallows every
 *    nested control, makes the accessible name a paragraph of text, and stops a buyer from
 *    selecting the price to copy it. The card gets `group` hover styling so it still reads
 *    as one clickable object, and `after:absolute` on the title link extends the hit area
 *    across the card without nesting anything.
 *
 * 2. **No image yet.** There is no vehicle photography in the seed, and a grey placeholder
 *    rectangle repeated 300 times is worse than an honest spec-led card. The gallery lands
 *    with Phase 3 proper. What is here is the layout it will slot into.
 *
 * 3. **Status is never colour alone.** The price-drop badge carries an arrow and the amount,
 *    the demonstration badge carries the word. Section 10's rule, and also the only way this
 *    palette works given the brand is built on one strong red.
 */
export function VehicleCard({ vehicle }: { vehicle: VehicleCardData }) {
  const drop = priceDrop(vehicle.price, vehicle.previousPrice);
  const title = [vehicle.modelYear, vehicle.makeName, vehicle.modelName, vehicle.variantName]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="group relative flex w-full flex-col rounded-lg border border-line bg-surface transition-shadow duration-[var(--duration-element)] ease-[var(--rn-ease-out)] hover:shadow-(--rn-shadow-2) focus-within:shadow-(--rn-shadow-2)">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-2xs font-semibold uppercase tracking-[var(--tracking-wide)] text-ink-secondary">
          {CONDITION_LABEL[vehicle.condition]}
        </span>
        {drop ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-1 text-2xs font-semibold text-success">
            <TrendingDown aria-hidden="true" className="size-3" />
            {drop}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        {/*
          Clamped to two lines with a matching min-height. Vehicle names run from
          "Suzuki Swift 1.2 GL" to "Toyota Hilux 2.8 GD-6 Legend RS Double Cab 4x4 AT", and
          letting that decide the card height leaves every row ragged.
        */}
        <h3 className="line-clamp-2 min-h-[2.6em] text-base leading-snug">
          <Link
            href={vehicleUrl(vehicle)}
            className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
          >
            {title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-xl font-extrabold tabular">{formatRand(vehicle.price)}</p>
          {vehicle.previousPrice ? (
            <p className="text-xs text-ink-muted">
              <span className="line-through tabular">{formatRand(vehicle.previousPrice)}</span>
              <span className="sr-only"> was the previous price</span>
            </p>
          ) : null}
        </div>

        {/*
          A two-column grid rather than a wrapping flex row. Flex-wrap dropped whichever
          item happened not to fit onto a line of its own, so one card would show "Bakkie"
          orphaned under three other specs while its neighbour showed all four inline. A
          grid puts the same spec in the same place on every card.
        */}
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-secondary">
          <li className="inline-flex items-center gap-1.5">
            <Gauge aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
            <span className="tabular">{formatKm(vehicle.mileageKm)}</span>
          </li>
          {vehicle.bodyName ? <li className="truncate">{vehicle.bodyName}</li> : null}
          {vehicle.transmissionName ? (
            <li className="truncate">{vehicle.transmissionName}</li>
          ) : null}
          {vehicle.fuelName ? <li className="truncate">{vehicle.fuelName}</li> : null}
        </ul>

        <div className="mt-auto flex flex-col gap-1 pt-4 text-xs text-ink-muted">
          {/*
            `min-w-0` on the name is load-bearing. A flex item defaults to `min-width: auto`,
            which means it refuses to shrink below its content, so `truncate` never engages
            and the row pushes the card 6px past the viewport at 320px.
          */}
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <BadgeCheck aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate">{vehicle.dealerName}</span>
            {/*
              This sits with the dealership rather than in the badge row above, for two
              reasons. It is a statement about the listing and the business, not about the
              vehicle's condition, so it belongs beside the name it qualifies. And in the
              badge row it wrapped onto a second line whenever a price-drop badge was also
              present, leaving one card in every few rows taller than its neighbours.
            */}
            {vehicle.isDemonstration ? (
              <span
                className="shrink-0 rounded-full border border-line-interactive px-1.5 text-2xs font-semibold"
                title="Seeded example listing. Not a real business and not a real vehicle for sale."
              >
                Demonstration
              </span>
            ) : null}
          </span>
          {vehicle.cityName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">
                {vehicle.cityName}
                {vehicle.provinceName ? `, ${vehicle.provinceName}` : ""}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
