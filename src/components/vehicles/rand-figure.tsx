import type { CSSProperties } from "react";

import { formatRand } from "@/lib/format";

/**
 * A price, set as a figure rather than as a string.
 *
 * Two things are happening here and both are load-bearing.
 *
 * **The Rand mark is typography, not text.** `R` is set back at 0.58em in muted ink so the
 * numerals dominate and the R sits behind them like a unit. That one detail is most of the
 * distance between a price that looks like a sticker and one that looks like a figure. The
 * full string is still one accessible text node, so a screen reader reads "R 249 900".
 *
 * **The size comes from the container, not the viewport.** `R 1 249 900` is eleven glyphs,
 * and expanded Archivo at 40px needs roughly 300px for it, so a viewport-only clamp
 * overflows a narrow card and pushes the page sideways at 320px. `--fig-adv` is how wide
 * this particular price is per point of type, worked out here on the server, and the
 * stylesheet divides the space available by it. See the .rn-figure rule.
 */

/*
 * How wide the figure is, in ems, as a straight line in the length of the number.
 *
 * Measured off the real face at 100px: "R 584 000" sets 581.3px wide and "R 1 249 900" sets
 * 681.4px, so each further character costs 0.50em and the "R " in front costs 2.31em on top
 * of the digits. Both numbers came from the browser, not from a table, and the typography
 * e2e test fails the build if the display face ever stops being served, which is the only
 * way these could quietly stop being true.
 *
 * The R is measured in rather than assumed away because it is set back at 0.58em: dividing
 * by the character count alone treats it as a full-width glyph, which is what left the
 * container query with no idea how much room it actually needed.
 */
const RAND_MARK_EMS = 2.31;
const PER_CHARACTER_EMS = 0.5;
/* Two percent, so a rounding difference in letter-spacing cannot land the last zero on its
   own line. It is not a fudge for the model above, which measures. */
const HEADROOM = 1.02;
export function RandFigure({ value, className = "" }: { value: number; className?: string }) {
  const text = formatRand(value);
  // Everything after the "R " is the number itself, which is what has to fit.
  const digits = text.slice(2);
  const advance = (RAND_MARK_EMS + PER_CHARACTER_EMS * digits.length) * HEADROOM;

  return (
    <p
      className={`rn-figure ${className}`}
      style={{ "--fig-adv": advance.toFixed(2) } as CSSProperties}
    >
      {/*
        The space between the R and the figure is REAL, not margin.

        Setting it back with `margin-inline-end` alone looked right and read wrong: the text
        content became "R584 000", so copying a price gave the wrong string, and a screen
        reader announced it without the separator. The house format is "R 249 900" and it is
        the format everywhere, including in the accessible name. The span is still narrowed
        by CSS; it just no longer eats the space.
      */}
      <span className="rn-rand">R</span>
      <span className="rn-rand-gap"> </span>
      {digits}
    </p>
  );
}
