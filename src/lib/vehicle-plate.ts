import { contrastRatio } from "@/lib/contrast";

/**
 * The colour plate: what fills a listing's image area when there is no photograph.
 *
 * There is no vehicle photography and there will not be any at launch. The usual answers are
 * both bad: a grey rectangle with a car icon looks broken, and a stock photo of a car that is
 * not this car is a lie on a site whose entire promise is that you know what you are dealing
 * with.
 *
 * So the image area is the car's ACTUAL PAINT COLOUR, with the manufacturer's own name for it
 * set in the corner like a gallery label. Every one of the 311 listings already carries a real
 * exterior colour with a real hex swatch, so this is honest: it is a fact about the car, drawn
 * large. A grid of them reads as a colour wall rather than as a page of missing images, and a
 * real photograph replaces it later without anything else changing.
 *
 * This module is the arithmetic, deliberately separate from the rendering so it can be tested
 * exhaustively. The part that matters most is `ink`: text has to stay readable on Glacier White
 * and on Midnight Black, and that is a computed decision rather than a guess.
 */

/** Where the tachometer sweep tops out. Beyond it the needle simply sits at full. */
export const MILEAGE_CEILING_KM = 250_000;

/** Used when a listing somehow has no colour on it. Neutral, and obviously not a paint colour. */
export const FALLBACK_SWATCH = "#8A8F98";

export type Plate = {
  /** The paint colour, as a hex the CSS can use directly. */
  swatch: string;
  /** The manufacturer's name for it, or null when there is nothing honest to print. */
  colourName: string | null;
  /** "light" or "dark" ink, whichever is readable on this swatch. */
  ink: "light" | "dark";
  /** The contrast the chosen ink actually achieves. Exposed so a test can assert on it. */
  inkContrast: number;
  /** 0 to 1, how far round the tachometer arc sweeps. Real mileage, not decoration. */
  sweep: number;
  /** A stable 0-359 hue offset for the plate's secondary texture, from the listing reference. */
  grain: number;
};

const LIGHT_INK = "#FFFFFF";
const DARK_INK = "#0C0D0F";

/**
 * Normalises whatever is in the database into a usable hex.
 *
 * Three-digit hexes and a missing leading hash both turn up in hand-entered data, and a colour
 * that fails to parse must not take the page down.
 */
export function normaliseSwatch(value: string | null | undefined): string {
  if (!value) return FALLBACK_SWATCH;

  const cleaned = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return FALLBACK_SWATCH;
}

/**
 * Which ink stays readable on this paint.
 *
 * Whichever of black or white reaches further, which is the only version of this that works
 * across a real manufacturer palette: Glacier White and Midnight Black are both in the
 * taxonomy, and one rule cannot serve both. The winner is returned with its ratio so the tests
 * can assert that every colour actually in the database clears 4.5:1 rather than assuming it.
 */
export function inkFor(swatch: string): { ink: "light" | "dark"; contrast: number } {
  const onLight = contrastRatio(LIGHT_INK, swatch);
  const onDark = contrastRatio(DARK_INK, swatch);

  return onLight >= onDark
    ? { ink: "light", contrast: onLight }
    : { ink: "dark", contrast: onDark };
}

/**
 * Mileage as a fraction of the arc.
 *
 * Linear to the ceiling and then clamped. A logarithmic scale would make a 30 000km car and a
 * 90 000km car look similar, and that difference is most of the buying decision.
 */
export function sweepFor(mileageKm: number | null | undefined): number {
  if (typeof mileageKm !== "number" || !Number.isFinite(mileageKm) || mileageKm <= 0) return 0;
  return Math.min(1, mileageKm / MILEAGE_CEILING_KM);
}

/**
 * A stable number from the listing reference.
 *
 * Deterministic on purpose: the same car must draw the same plate on every render, or the grid
 * flickers between server and client and looks broken. FNV-1a, because it is four lines and
 * needs no dependency.
 */
export function grainFor(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 360;
}

export function plateFor(vehicle: {
  publicRef?: string | null;
  mileageKm?: number | null;
  colourSwatch?: string | null;
  colourName?: string | null;
}): Plate {
  const swatch = normaliseSwatch(vehicle.colourSwatch);
  const { ink, contrast } = inkFor(swatch);

  return {
    swatch,
    // Only printed when there is a real manufacturer name. "Unknown" on a gallery label is
    // worse than no label.
    colourName: vehicle.colourName?.trim() || null,
    ink,
    inkContrast: contrast,
    sweep: sweepFor(vehicle.mileageKm),
    grain: grainFor(vehicle.publicRef || swatch),
  };
}
