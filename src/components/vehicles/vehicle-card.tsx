import Link from "next/link";

import { ColourPlate } from "@/components/vehicles/colour-plate";
import { RandFigure } from "@/components/vehicles/rand-figure";
import { formatKm, formatRand } from "@/lib/format";
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
  /** The car's real paint colour, which is what fills the image area until there are photos. */
  colourName: string | null;
  colourSwatch: string | null;
  colourFamily: string | null;
};

/**
 * A vehicle in a result grid.
 *
 * The card is not a box. It is a column on a ruled sheet: no border, no radius, no shadow.
 * The gutters between cards are hairlines showing through the grid container, which is what
 * deletes twenty-four per-card borders in one declaration. See the .rn-grid rule.
 *
 * FOUR DECISIONS THAT PREDATE THIS DESIGN AND MUST SURVIVE IT. Each exists because a
 * specific bug happened.
 *
 * 1. **The whole card is not a link. The title is.** A card-sized anchor swallows every
 *    nested control, makes the accessible name a paragraph of text, and stops a buyer from
 *    selecting the price to copy it. `after:absolute inset-0` on the title link extends the
 *    hit area across the card without nesting anything.
 *
 * 2. **`line-clamp-2` with a matching `min-h`.** Vehicle names run from "Suzuki Swift 1.2
 *    GL" to "Toyota Hilux 2.8 GD-6 Legend RS Double Cab 4x4 AT", and letting that decide the
 *    card height leaves every row ragged.
 *
 * 3. **A two-column grid for the specs, not a wrapping flex row.** Flex-wrap dropped
 *    whichever item happened not to fit onto a line of its own, so one card showed "Bakkie"
 *    orphaned under three other specs while its neighbour showed all four inline.
 *
 * 4. **`min-w-0` on the dealer name.** A flex item defaults to `min-width: auto` and refuses
 *    to shrink below its content, so `truncate` never engages and the row pushes the card
 *    6px past the viewport at 320px.
 *
 * WHAT CHANGED, AND WHY
 *
 * **Every icon is gone.** A `BadgeCheck` next to a dealer name is what every template
 * ships and it persuades nobody. The word VERIFIED in a ruled box, backed by named evidence
 * on the dealership page, is a claim someone can check. It is also true by construction: a
 * listing cannot go live unless its dealership is verified, which is enforced in a hook on
 * the vehicles collection, not merely promised in copy.
 *
 * **The price leads, but not by as much as it wants to.** Two and a half to one over the
 * title, not four and a half. A buyer hunting a bakkie under R400 000 has to read
 * "Hilux 2.8 GD-6 Legend RS 4x4 AT" before they care about the number. Price-first is
 * browsing furniture; model-first is hunting a car.
 *
 * **Status is never colour alone.** A price drop carries a minus and the amount. The
 * demonstration marker carries the word and a rule, not a colour.
 */
export function VehicleCard({
  vehicle,
  index = 0,
}: {
  vehicle: VehicleCardData;
  /** Position in the grid, for the staggered plate fade. */
  index?: number;
}) {
  const title = [vehicle.modelYear, vehicle.makeName, vehicle.modelName, vehicle.variantName]
    .filter(Boolean)
    .join(" ");
  const dropAmount =
    vehicle.previousPrice && vehicle.previousPrice > vehicle.price
      ? vehicle.previousPrice - vehicle.price
      : null;

  return (
    <article className="rn-card">
      <ColourPlate
        publicRef={vehicle.publicRef}
        mileageKm={vehicle.mileageKm}
        colourSwatch={vehicle.colourSwatch}
        colourFamily={vehicle.colourFamily}
        colourName={vehicle.colourName}
        provinceName={vehicle.provinceName}
        cityName={vehicle.cityName}
        condition={vehicle.condition}
        index={index}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <RandFigure value={vehicle.price} />
          {dropAmount ? (
            <p className="rn-label rn-card__accent mt-1.5 tabular">
              {/* The word "off" goes. The minus and the amount say it. */}
              <span aria-hidden="true">- {formatRand(dropAmount)}</span>
              <span className="sr-only">
                Reduced by {formatRand(dropAmount)} from {formatRand(vehicle.previousPrice ?? 0)}
              </span>
            </p>
          ) : null}
        </div>

        <h3 className="line-clamp-2 min-h-[2.6em] text-sm font-medium leading-snug tracking-normal [font-variation-settings:'wdth'_100]">
          <Link href={vehicleUrl(vehicle)} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>

        <ul className="rn-card__muted grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <li className="tabular">{formatKm(vehicle.mileageKm)}</li>
          {vehicle.bodyName ? <li className="truncate">{vehicle.bodyName}</li> : null}
          {vehicle.transmissionName ? (
            <li className="truncate">{vehicle.transmissionName}</li>
          ) : null}
          {vehicle.fuelName ? <li className="truncate">{vehicle.fuelName}</li> : null}
        </ul>

        <hr className="rn-card__rule mt-auto" />

        <div className="flex items-start gap-3">
          <p className="rn-label shrink-0 border border-current px-1.5 py-1">Verified</p>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{vehicle.dealerName}</p>
            {vehicle.cityName ? (
              <p className="rn-card__muted rn-label rn-label--light mt-1 truncate">
                {vehicle.cityName}
              </p>
            ) : null}
          </div>
        </div>

        {/*
          A demonstration listing says so in words a person can read.
          ----------------------------------------------------------
          This was a two pixel underline under the dealer name, a `title` attribute and a
          screen-reader-only sentence. A sighted visitor saw an underline, which reads as
          emphasis rather than as a warning, so in practice 311 listings for cars that do not
          exist were presented as stock for sale. The client's brief forbids exactly that, and
          a marker only a screen reader can hear is not a marker.
        */}
        {vehicle.isDemonstration ? (
          <p className="rn-label rn-card__muted border-t border-current pt-2">
            Demonstration listing, not for sale
          </p>
        ) : null}
      </div>
    </article>
  );
}
