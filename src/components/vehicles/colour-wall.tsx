import Link from "next/link";
import type { CSSProperties } from "react";

import type { ColourTile } from "@/lib/home-data";
import { plateField } from "@/lib/vehicle-plate";

/**
 * The colour wall as navigation.
 *
 * The same `plateField` engine that draws every listing, applied to the colour taxonomy
 * itself, with the manufacturer's own name and a live count on each. It is generated from
 * data, every figure is real, and it is a filter buyers genuinely use: colour is one of the
 * few things a person decides before they decide on a model.
 *
 * On a narrow screen it is a scroll-snapped rail inside its own overflow container rather
 * than a squeezed sixteen-column grid, so the page itself never scrolls sideways.
 */
export function ColourWall({
  colours,
  className = "",
}: {
  colours: ColourTile[];
  className?: string;
}) {
  return (
    <ul className={`rn-wall ${className}`}>
      {colours.map((colour) => (
        <li key={colour.slug}>
          <Link
            href={`/cars?colour=${colour.slug}`}
            className="rn-wall__tile"
            style={
              {
                "--plate-field": plateField(colour.swatch, colour.family, "light"),
                "--plate-field-dark": plateField(colour.swatch, colour.family, "dark"),
              } as CSSProperties
            }
          >
            <span className="rn-label">{colour.name}</span>
            <span className="rn-label rn-label--light tabular">{colour.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
