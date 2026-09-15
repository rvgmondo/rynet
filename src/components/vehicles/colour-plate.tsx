import type { CSSProperties } from "react";

/**
 * The no-photograph state.
 *
 * A dealership adds stock before it photographs it, so a listing without photographs is a real
 * state, and it has to look deliberate rather than broken. This is a soft panel tinted with the
 * car's RECORDED paint colour, a thin line drawing of its body shape, and "Photos coming soon".
 *
 * Two things it used to get wrong. It was a flat grey panel with a filled sedan silhouette, so
 * three in a row on a dealership page read as failed image loads; and the silhouette was a sedan
 * even on a Ranger double cab, a small untruth about the car. The drawing now follows the body type
 * (bakkie, SUV, hatchback, otherwise sedan) and the panel carries a light wash of the paint colour.
 *
 * On a listing page (`hero`) the colour's name is written out, since that caption is the only place
 * it appears near the picture. On a card it is not: the card is short on room and the wash says
 * enough. The names and props are kept so the call sites did not have to change; the plate-only
 * props are accepted and ignored.
 *
 * Every mark here is a value from the record or a plain statement of fact. No invented colour:
 * the wash is drawn only when the record carries a valid hex value.
 */

export type PlateVariant = "card" | "thumb" | "hero";

type Shape = "sedan" | "hatch" | "suv" | "bakkie";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function shapeOf(body: string | null | undefined): Shape {
  const name = (body ?? "").toLowerCase();
  if (/bakkie|pick ?up|double cab|single cab/.test(name)) return "bakkie";
  if (/suv|crossover|4x4|mpv|off.?road/.test(name)) return "suv";
  if (/hatch/.test(name)) return "hatch";
  return "sedan";
}

/*
 * Side-on line drawings in one 120 by 48 box, drawn in currentColor: the body with its wheel arches
 * cut out, the glasshouse, a pillar, and the two wheels.
 */
const SHAPES: Record<Shape, { body: string; glass: string; wheels: [number, number, number] }> = {
  sedan: {
    body: "M8 34H21A7 7 0 0 1 35 34H85A7 7 0 0 1 99 34H112V28C112 24 109 21.5 105 21L88 19L78 11C76 9 73 8 70 8H47C44 8 42 9 40 10L26 19L12 21C9 21.5 8 24 8 27Z",
    glass:
      "M31 19L41 12.2C42.5 11.1 44.3 10.5 46.2 10.5H69.3C71.5 10.5 73.5 11.3 75 12.8L82 19ZM58 10.5V19",
    wheels: [28, 92, 5.5],
  },
  hatch: {
    body: "M18 34H27A7 7 0 0 1 41 34H79A7 7 0 0 1 93 34H106V28C106 24 103.5 21.5 99.5 21L86 19.5L75 10.5C73 9 70.5 8 68 8H38C34 8 31 9.5 28.5 12L20 21.5C18.7 23 18 25 18 27Z",
    glass:
      "M28 19.5L33.5 13C35 11.4 37 10.5 39 10.5H67.5C69.5 10.5 71.3 11.1 72.8 12.3L80 19.5ZM54 10.5V19.5",
    wheels: [34, 86, 5.5],
  },
  suv: {
    body: "M8 36H21A8 8 0 0 1 37 36H83A8 8 0 0 1 99 36H113V27C113 23 110 20.5 106 20L90 18L82 7C80.5 5 78 4 75 4H16C12 4 10 6 9.5 9L8 20Z",
    glass: "M14 17L15 9C15.2 7.8 16 7 17.5 7H74C76 7 77.8 7.8 79 9.3L85 17ZM46 7V17M64 7V17",
    wheels: [29, 91, 6.5],
  },
  bakkie: {
    body: "M6 36H21A8 8 0 0 1 37 36H83A8 8 0 0 1 99 36H114V27C114 23 111 20.5 107 20L92 18L84 7C82.5 5 80 4 77 4H44C41 4 39 6 38.5 9L37 18H6Z",
    glass: "M42 17L43 9C43.2 7.8 44 7 45.5 7H76C78 7 79.8 7.8 81 9.3L87 17ZM62 7V17",
    wheels: [29, 91, 6.5],
  },
};

function CarDrawing({ shape, className = "" }: { shape: Shape; className?: string }) {
  const { body, glass, wheels } = SHAPES[shape];
  const [rear, front, radius] = wheels;
  const y = shape === "suv" || shape === "bakkie" ? 36 : 34;
  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={body} />
      <path d={glass} />
      <circle cx={rear} cy={y} r={radius} />
      <circle cx={front} cy={y} r={radius} />
    </svg>
  );
}

export function ColourPlate({
  colourSwatch,
  colourName,
  bodyName,
  variant = "card",
  className = "",
}: {
  publicRef?: string | null;
  mileageKm?: number | null;
  colourSwatch?: string | null;
  colourFamily?: string | null;
  colourName?: string | null;
  /** The body type's name, which picks the drawing. */
  bodyName?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  condition?: "new" | "demo" | "pre_owned" | null;
  variant?: PlateVariant;
  index?: number;
  className?: string;
}) {
  const swatch = colourSwatch && HEX.test(colourSwatch.trim()) ? colourSwatch.trim() : null;
  const style = swatch ? ({ "--plate-paint": swatch } as CSSProperties) : undefined;

  return (
    <div
      className={`rn-noimage rn-noimage--${variant} ${swatch ? "rn-noimage--tinted" : ""} ${className}`}
      style={style}
    >
      <CarDrawing shape={shapeOf(bodyName)} className="rn-noimage__car" />
      {variant === "thumb" ? null : (
        <p className="rn-noimage__caption">
          {variant === "hero" && colourName ? (
            <span className="rn-noimage__colour">
              <span className="sr-only">Colour: </span>
              {colourName}
            </span>
          ) : null}
          <span>Photos coming soon</span>
        </p>
      )}
    </div>
  );
}
