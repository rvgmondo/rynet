/**
 * Formatting, South African conventions.
 *
 * One place, because a marketplace that formats R 249 900 three different ways looks
 * exactly as careless as it is. The space-separated thousands group is the South African
 * convention and it is not negotiable: `R249,900` reads as an American import.
 *
 * THE SPACES DO NOT BREAK. Every space inside a figure (after the R, between the groups, and
 * before a unit) is a no-break space, U+00A0, so a line can never end on "R 1 020" and start the
 * next one on "800". That happened in a narrow price range on a phone, and it could happen in any
 * sentence or chip that carries a figure ("Under R 250 000", "Reduced by R 13 400", "priced from
 * R 83 300 to R 1 489 600", "103 900 km"). Doing it here fixes every one of them at once.
 *
 * Copying a price still gives ordinary spaces (browsers write U+00A0 to the clipboard as U+0020).
 * Tests compare through `plain()`, and a regex `\s` matches U+00A0, so the no-rand check on
 * /sell-to-a-dealer still sees every figure.
 */

/** The no-break space that joins the parts of a figure. */
export const NBSP = "\u00a0";

/**
 * A whole number grouped in threes: `1 249 900`. `toLocaleString("en-ZA")` is not consistent
 * across Node builds and ICU versions (a comma, a space, U+00A0 or U+202F), so the separators are
 * normalised rather than trusted.
 */
function grouped(value: number): string {
  return Math.round(value)
    .toLocaleString("en-ZA")
    .replace(/[,\s\u202f]/g, NBSP);
}

/** A formatted figure with ordinary spaces, for comparing against text written by hand. */
export function plain(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

/** `R 249 900`. No decimals, because no dealership prices a car at R 249 900,00. */
export function formatRand(value: number): string {
  return `R${NBSP}${grouped(value)}`;
}

/** `R 5 480 pm`, for instalment estimates. Always paired with the disclaimer. */
export function formatMonthly(value: number): string {
  return `${formatRand(value)}${NBSP}pm`;
}

/** `147 200 km`. */
export function formatKm(value: number): string {
  return `${grouped(value)}${NBSP}km`;
}

/** `2 755 cc`. */
export function formatCc(value: number): string {
  return `${grouped(value)}${NBSP}cc`;
}

/**
 * Vehicle alt text, generated from the attributes.
 *
 * Every vehicle photograph needs alt text, and no dealership is going to write it for
 * twenty photos a car. Generated text that says what the vehicle actually is beats both an
 * empty alt and a dealer typing "car" twenty times. The dealership can override it per
 * image where the photo shows something specific, such as damage or the service book.
 */
export function vehicleAlt(parts: {
  modelYear?: number | null;
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  colour?: string | null;
  index?: number;
  total?: number;
}): string {
  const name = [parts.modelYear, parts.make, parts.model, parts.variant].filter(Boolean).join(" ");
  const colour = parts.colour ? ` in ${parts.colour}` : "";
  const position =
    parts.index !== undefined && parts.total !== undefined && parts.total > 1
      ? `, photo ${parts.index + 1} of ${parts.total}`
      : "";
  return `${name || "Vehicle"}${colour}${position}`;
}
