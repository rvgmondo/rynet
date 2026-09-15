import { relName } from "@/lib/relations";
import type { Branch } from "@/payload-types";

/**
 * Contact links built only from fields a branch actually stores. Nothing here guesses a number
 * or an address that is not in the record.
 */

/** "086 000 0101" dials as +27860000101, which works from a South African or a foreign phone. */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.replace(/\D/g, "").length < 9) return null;
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("27")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+27${digits.slice(1)}`;
  return `tel:${digits}`;
}

/** wa.me wants the international number with no plus and no leading zero. */
export function whatsappHref(number: string, message?: string): string | null {
  let digits = number.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** The branch's street address as one line, in the order a map search expects. */
export function addressLine(branch: Branch): string {
  return [
    branch.addressLine1,
    branch.addressLine2,
    branch.suburb,
    relName(branch.city),
    relName(branch.province),
    branch.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Directions from wherever the buyer is to the stored street address, through the Google Maps
 * universal link, which opens the Maps app on a phone and the website on a desktop. The address
 * rather than the coordinates, because a geocoded pin can land wrong and the address is what the
 * dealership wrote down.
 */
export function directionsHref(branch: Branch): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${addressLine(branch)}, South Africa`,
  )}`;
}
