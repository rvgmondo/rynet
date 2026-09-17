"use client";

import { useRowLabel } from "@payloadcms/ui";

/**
 * The heading of a row in a list of rows (photos, opening hours, notes), in words.
 *
 * Payload's own heading is the row's noun and a padded number, "Item 01", "Day 03", which says
 * nothing about the row. This shows what the row holds when it holds something ("Monday",
 * "Up to 25 live listings", "Test drive request to sales@example.co.za") and "Photo 2" when it
 * does not.
 *
 * Display only: it reads the row from the form and writes nothing. Configured per field with
 * clientProps, see the collections.
 */

type Option = { value: string; label: string };

type Props = {
  /** The row's noun, capitalised: "Photo". */
  noun: string;
  /** The row value to show. */
  field?: string;
  /** Labels for a select value. */
  options?: Option[];
  /** A second value, joined after the first: "Test drive request to sales@example.co.za". */
  also?: string;
  /** The words between the two values. */
  joiner?: string;
  /** Added to the first row's heading, for example "the main photo". */
  firstNote?: string;
};

function asText(value: unknown, options?: Option[]): string {
  if (value === null || value === undefined) return "";
  if (options) {
    const match = options.find((option) => option.value === value);
    if (match) return match.label;
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function RowLabel({ noun, field, options, also, joiner = ", ", firstNote }: Props) {
  const { data, rowNumber } = useRowLabel<Record<string, unknown> | undefined>();
  const index = typeof rowNumber === "number" ? rowNumber : 0;

  const first = field ? asText(data?.[field], options) : "";
  const second = also ? asText(data?.[also]) : "";
  const summary = [first, second].filter(Boolean).join(joiner);

  const base = summary ? summary.replace(/\s+/g, " ") : `${noun} ${index + 1}`;
  const label = index === 0 && firstNote ? `${base}, ${firstNote}` : base;

  /*
   * A long note is cut to one line by the stylesheet (.rn-admin-row-label), so the whole note is
   * still there for a screen reader and in the row itself.
   */
  return <span className="row-label rn-admin-row-label">{label}</span>;
}
