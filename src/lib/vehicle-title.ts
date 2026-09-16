/**
 * The name a car is stored and listed under in the admin: `2023 Toyota Corolla Cross 1.8 Xi`.
 *
 * Year, make, model and variant, in the same order as the public listing title, joined by single
 * spaces. The derivative is left out, as it is on the site. Pure, so the collection hook and the
 * migration that recomputes stored titles build exactly the same string.
 */

export type VehicleTitleParts = {
  modelYear?: number | string | null;
  make?: string | null;
  model?: string | null;
  variant?: string | null;
};

export const UNTITLED_VEHICLE = "Untitled vehicle";

function yearOf(value: VehicleTitleParts["modelYear"]): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const year = Number(value);
  return Number.isFinite(year) ? String(Math.trunc(year)) : null;
}

function textOf(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

export function vehicleTitle(parts: VehicleTitleParts): string {
  const title = [
    yearOf(parts.modelYear),
    textOf(parts.make),
    textOf(parts.model),
    textOf(parts.variant),
  ]
    .filter((part): part is string => part !== null)
    .join(" ");
  return title || UNTITLED_VEHICLE;
}
