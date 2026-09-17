"use client";

import { useFormFields } from "@payloadcms/ui";

import { formatKm, formatRand } from "@/lib/format";

/**
 * Under a price typed as whole rands ("249900"), the same figure written the South African way
 * ("R 249 900"), so an extra or missing zero is caught before it is saved.
 *
 * Display only: it reads the field's value from the form and writes nothing. Not a live region,
 * because it would announce on every keystroke; it follows the field in reading order.
 */
export function RandPreview({ path = "price" }: { path?: string }) {
  const value = useFormFields(([fields]) => fields?.[path]?.value);
  const amount = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) {
    return null;
  }
  return <p className="rn-admin-field-preview">Reads as {formatRand(amount)}</p>;
}

/**
 * Under a distance typed as whole kilometres ("64500"), the same figure grouped ("64 500 km"),
 * for the same reason as the price: an extra zero is easy to miss in a bare number.
 */
export function KmPreview({ path = "mileageKm" }: { path?: string }) {
  const value = useFormFields(([fields]) => fields?.[path]?.value);
  const amount = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(amount)) {
    return null;
  }
  return <p className="rn-admin-field-preview">Reads as {formatKm(amount)}</p>;
}
