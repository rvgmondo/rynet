/**
 * Formatting, South African conventions.
 *
 * One place, because a marketplace that formats R 249 900 three different ways looks
 * exactly as careless as it is. The space-separated thousands group is the South African
 * convention and it is not negotiable: `R249,900` reads as an American import.
 */

/** `R 249 900`. No decimals, because no dealership prices a car at R 249 900,00. */
export function formatRand(value: number): string {
  return `R ${Math.round(value).toLocaleString("en-ZA").replace(/[, ]/g, " ")}`;
}

/** `R 5 480 pm`, for instalment estimates. Always paired with the disclaimer. */
export function formatMonthly(value: number): string {
  return `${formatRand(value)} pm`;
}

/** `147 200 km`. */
export function formatKm(value: number): string {
  return `${Math.round(value).toLocaleString("en-ZA").replace(/[, ]/g, " ")} km`;
}

/** `2 755 cc`. */
export function formatCc(value: number): string {
  return `${Math.round(value).toLocaleString("en-ZA").replace(/[, ]/g, " ")} cc`;
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

/** Turns a price drop into the sentence a buyer actually wants: how much came off. */
export function priceDrop(current: number, previous?: number | null): string | null {
  if (!previous || previous <= current) return null;
  return `${formatRand(previous - current)} off`;
}
