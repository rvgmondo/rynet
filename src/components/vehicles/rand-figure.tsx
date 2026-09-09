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
 * overflows a narrow card and pushes the page sideways at 320px. `--fig-chars` is measured
 * from the formatted string here on the server, and the stylesheet divides the container
 * width by it. See the .rn-figure rule for why the constant is what it is.
 */
export function RandFigure({ value, className = "" }: { value: number; className?: string }) {
  const text = formatRand(value);
  // Everything after the "R " is the number itself, which is what has to fit.
  const digits = text.slice(2);

  return (
    <p
      className={`rn-figure ${className}`}
      style={{ "--fig-chars": Math.max(digits.length, 5) } as CSSProperties}
    >
      <span className="rn-rand">R</span>
      {digits}
    </p>
  );
}
