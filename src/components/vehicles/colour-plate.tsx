/**
 * The no-photograph state.
 *
 * A dealership adds stock before it photographs it, so a listing without photographs is a real
 * state, and it has to look deliberate rather than broken. This is a light panel with a car
 * silhouette, a small swatch of the car's RECORDED paint colour beside the manufacturer's name for
 * it, and "Photos coming soon".
 *
 * It replaced the colour plate (a full-bleed field of the paint colour with a mileage gauge drawn
 * across it). Among photographs that plate read as a failed image load, and at phone width its
 * text collided with the arc. The name and the props are kept so the listing gallery and the
 * cards did not have to change their call sites; the plate-only props are accepted and ignored.
 *
 * Every mark here is a value from the record or a plain statement of fact. No invented colour:
 * the swatch is drawn only when the record carries a valid hex value.
 */

export type PlateVariant = "card" | "thumb" | "hero";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A side-on car silhouette, drawn once, filled with currentColor. */
function CarSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M9 34.5c-2.5 0-4-1.6-4-3.9v-5.2c0-2.4 1.4-4.2 3.7-4.8l14.6-3.7 13.3-8.6C39.4 6.2 42.6 5 46 5h22.8c3.8 0 7.3 1.4 10 4l9.6 9.2 16.4 2.7c5.3.9 9.2 5.5 9.2 10.9v.3c0 1.3-1 2.4-2.3 2.4h-6.3a11.5 11.5 0 0 0-22.8 0H40.4a11.5 11.5 0 0 0-22.8 0zm35.3-26c-2 0-3.9.6-5.5 1.6l-9 5.9h23.5V8.5zm13 0v7.5h25.6l-6.8-6.1a6.3 6.3 0 0 0-4.2-1.4z" />
      <circle cx="29" cy="36" r="8.5" />
      <circle cx="88.6" cy="36" r="8.5" />
    </svg>
  );
}

export function ColourPlate({
  colourSwatch,
  colourName,
  variant = "card",
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
  index?: number;
  className?: string;
}) {
  const swatch = colourSwatch && HEX.test(colourSwatch.trim()) ? colourSwatch.trim() : null;

  return (
    <div className={`rn-noimage rn-noimage--${variant} ${className}`}>
      <CarSilhouette className="rn-noimage__car" />
      {variant === "thumb" ? null : (
        <p className="rn-noimage__caption">
          {colourName ? (
            <span className="rn-noimage__colour">
              {swatch ? (
                <span
                  className="rn-noimage__swatch"
                  style={{ backgroundColor: swatch }}
                  aria-hidden="true"
                />
              ) : null}
              <span>
                <span className="sr-only">Colour: </span>
                {colourName}
              </span>
            </span>
          ) : null}
          <span>Photos coming soon</span>
        </p>
      )}
    </div>
  );
}
