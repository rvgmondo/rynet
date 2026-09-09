import type { CSSProperties } from "react";

import { formatKm } from "@/lib/format";
import { plateFor, provinceCodeFor, REDLINE_FROM } from "@/lib/vehicle-plate";

/**
 * The colour plate.
 *
 * There is no vehicle photography and there will not be any at launch. The two obvious
 * answers are both bad: a grey rectangle with a car icon looks broken, and a stock
 * photograph of a car that is not this car is a lie on a site whose entire promise is
 * knowing what you are dealing with.
 *
 * So the image area is a field derived from the car's ACTUAL RECORDED PAINT COLOUR, full
 * bleed, carrying the manufacturer's own name for it as a gallery label, the province
 * registration code stamped opposite, and the brand's tachometer drawn across it reading
 * this car's real odometer. A grid of twenty-four reads as a colour wall rather than as a
 * page of missing images.
 *
 * THE DISCIPLINE RULE, and it is not negotiable: EVERY MARK ON THE PLATE IS A VALUE FROM
 * THE VEHICLE RECORD, OR IT DOES NOT SHIP. This is the most abstract object in the product
 * and therefore the most likely to accumulate decorative flourishes. The moment someone
 * adds a mark that is not a reading, it stops being a colour index and becomes a novelty,
 * and a novelty is cheaper than the plain page it replaced. In particular: no invented
 * score, no second gauge, and never a needle that turns green for good and red for bad,
 * which would be a fabricated rating.
 *
 * HOW IT IS BUILT
 *
 * Four layers and one 400 byte inline SVG. No raster assets, no network requests, no
 * canvas, no client colour maths, sharp at any pixel density, works with JavaScript off.
 * The drawing lives in one shared stylesheet rule and each card contributes four custom
 * properties, so twenty-four of them cost kilobytes rather than twenty-four requests.
 *
 * Both themes are emitted as plain hex on the element. The field is picked by CSS, so
 * nothing has to run in the browser and nothing flickers between server and client.
 *
 * The arc's viewBox is 200 by 125, which is exactly the plate's 16:10, so it scales without
 * distortion at every variant. `pathLength` is 100, so every dash figure is a percentage
 * and the same markup renders in an 88px register thumbnail and at 400px on a vehicle page
 * with no arithmetic anywhere.
 *
 * A PHOTOGRAPH REPLACES IT LATER without anything else changing. The field stays underneath
 * as the loading state and the letterbox fill, so a portrait phone snap of a bakkie sits in
 * a band of its own declared paint rather than in grey bars.
 */

const ARC = "M 0 96 A 125 125 0 0 1 200 96";

/** The stagger is capped, because a wave that runs down twenty-four cards reads as a delay. */
const MAX_STAGGER_INDEX = 8;

export type PlateVariant = "card" | "thumb" | "hero";

export function ColourPlate({
  publicRef,
  mileageKm,
  colourSwatch,
  colourFamily,
  colourName,
  provinceName,
  cityName,
  condition,
  variant = "card",
  index = 0,
  className = "",
}: {
  publicRef?: string | null;
  mileageKm?: number | null;
  colourSwatch?: string | null;
  colourFamily?: string | null;
  colourName?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  condition?: "new" | "demo" | "pre_owned" | null;
  variant?: PlateVariant;
  /** Position in the grid, for the staggered fade. */
  index?: number;
  className?: string;
}) {
  const plate = plateFor({ publicRef, mileageKm, colourSwatch, colourFamily, colourName });
  const code = provinceCodeFor(provinceName);
  // Pre-owned is the default and does not need saying, which removes furniture from most
  // cards. New and demo are the two facts a buyer would want shouted.
  const conditionMark = condition === "new" ? "New" : condition === "demo" ? "Demo" : null;

  return (
    <div
      className={`rn-plate rn-plate--${variant} ${className}`}
      style={
        {
          "--plate-field": plate.field,
          "--plate-field-dark": plate.fieldDark,
          "--plate-grain": plate.grain,
          "--plate-index": Math.min(index, MAX_STAGGER_INDEX),
          "--sweep": plate.sweep * 100,
        } as CSSProperties
      }
    >
      {/*
        Decorative. The mileage it encodes is printed as text on the plate and again on the
        card, so a screen reader hearing it a third time would be worse than not hearing it.
      */}
      <svg className="rn-plate__gauge" viewBox="0 0 200 125" aria-hidden="true" focusable="false">
        <title>Mileage gauge</title>
        <path className="rn-plate__track" d={ARC} pathLength={100} />
        <path className="rn-plate__value" d={ARC} pathLength={100} />
        {plate.sweep > REDLINE_FROM ? (
          <>
            {/* Redline as stroke weight, never colour: status is never carried by colour
                alone, and it keeps red off the plates entirely. */}
            <path className="rn-plate__redline" d={ARC} pathLength={100} />
            <line className="rn-plate__tick" x1="161.2" y1="72.5" x2="170.7" y2="57.2" />
          </>
        ) : null}
      </svg>

      {conditionMark ? <p className="rn-plate__condition rn-label">{conditionMark}</p> : null}

      <div className="rn-plate__band">
        <div className="rn-plate__place">
          {code ? <p className="rn-label rn-plate__code">{code}</p> : null}
          {cityName ? <p className="rn-label rn-label--light">{cityName}</p> : null}
        </div>
        <div className="rn-plate__paint">
          {/* The plate is a claim about the car's colour, so the manufacturer's name for it
              is the source of truth and is always printed when there is one. */}
          <p className="rn-label">{plate.colourName ?? "Colour not supplied"}</p>
          {mileageKm ? (
            <p className="rn-label rn-label--light tabular">{formatKm(mileageKm)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
