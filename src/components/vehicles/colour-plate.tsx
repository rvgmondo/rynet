import { plateFor } from "@/lib/vehicle-plate";

/**
 * The colour plate.
 *
 * There is no vehicle photography and there will not be any at launch, and the two obvious
 * answers are both bad: a grey rectangle with a car icon looks broken, and a stock photograph
 * of a car that is not this car is a lie on a site whose entire promise is knowing what you are
 * dealing with.
 *
 * So the image area is the car's ACTUAL PAINT COLOUR, full bleed, with the manufacturer's own
 * name for it set small in the corner like a gallery label, and the brand's tachometer arc
 * drawn across it as a real mileage gauge. Every one of the 311 listings already carries a real
 * colour with a real hex, so none of this is invented. A grid of twenty-four reads as a colour
 * wall rather than as a page of missing images.
 *
 * WHY IT IS BUILT LIKE THIS
 *
 * **Almost nothing per card.** The drawing lives in one shared stylesheet rule. Each card
 * contributes three custom properties and a 300-byte inline SVG path, so twenty-four of them
 * cost kilobytes rather than twenty-four network requests or twenty-four canvases.
 *
 * **Server rendered and deterministic.** The same car draws the same plate every time, so
 * nothing flickers between the server and the client.
 *
 * **The ink is computed, not chosen.** Glacier White and Midnight Black are both real entries
 * in the colour taxonomy and one hard-coded text colour cannot serve both. `inkFor` picks
 * whichever of black or white actually reaches further, and a unit test asserts that every
 * colour in the taxonomy clears 4.5:1.
 *
 * **A photograph replaces it later** by rendering an `<img>` in the same box. Nothing else
 * about the card changes, and a listing with photographs and one without can sit side by side
 * without the grid looking broken.
 */
export function ColourPlate({
  publicRef,
  mileageKm,
  colourSwatch,
  colourName,
  index = 0,
  className = "",
}: {
  publicRef?: string | null;
  mileageKm?: number | null;
  colourSwatch?: string | null;
  colourName?: string | null;
  /** Position in the grid, for the staggered sweep. */
  index?: number;
  className?: string;
}) {
  const plate = plateFor({ publicRef, mileageKm, colourSwatch, colourName });

  // The arc is a 90 degree sweep of a circle of radius 34 drawn in a 96 box. Its length is
  // needed as a real number so the dash can be offset by the mileage fraction.
  const ARC_LENGTH = 106.8;
  const offset = ARC_LENGTH * (1 - plate.sweep);

  return (
    <div
      className={`rn-plate rn-plate--${plate.ink} ${className}`}
      style={
        {
          "--plate-swatch": plate.swatch,
          "--plate-grain": `${plate.grain}deg`,
          "--plate-index": index,
        } as React.CSSProperties
      }
    >
      {/*
        Decorative. The mileage it encodes is printed as text on the card itself, so a screen
        reader hearing this twice would be worse than not hearing it at all.
      */}
      <svg className="rn-plate__gauge" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
        <title>Mileage gauge</title>
        <path className="rn-plate__track" d="M 14 82 A 34 34 0 0 1 82 82" />
        <path
          className="rn-plate__needle"
          d="M 14 82 A 34 34 0 0 1 82 82"
          style={
            {
              "--arc-length": ARC_LENGTH,
              "--arc-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>

      {plate.colourName ? <p className="rn-plate__label">{plate.colourName}</p> : null}
    </div>
  );
}
