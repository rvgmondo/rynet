"use client";

import type { DefaultCellComponentProps } from "payload";

import { type BadgeTone, optionLabel } from "@/lib/admin-list";
import { formatKm, formatRand } from "@/lib/format";

/**
 * List cells that show a stored value the way a person reads it: "R 181 700" rather than
 * 181700, "103 900 km", "Yes" rather than a raw true, and a status as a small badge with words
 * in it.
 *
 * Never used on a list's first column: Payload links the first column to the record and lets a
 * picker select from it, and a custom cell replaces both.
 *
 * Display only. Nothing here changes what is stored.
 */

function Empty({ children = "Not set" }: { children?: string }) {
  return <span className="rn-admin-cell rn-admin-cell--empty">{children}</span>;
}

/** A price in rand. A car priced on request still shows its stored price, marked as such. */
export function RandCell({ cellData, rowData }: DefaultCellComponentProps) {
  if (typeof cellData !== "number" || !Number.isFinite(cellData)) return <Empty />;
  const onRequest = rowData?.priceType === "poa";
  return (
    <span className="rn-admin-cell rn-admin-cell--figure">
      {formatRand(cellData)}
      {onRequest ? <span className="rn-admin-cell__note">Price on request</span> : null}
    </span>
  );
}

/** A distance in kilometres. */
export function KmCell({ cellData }: DefaultCellComponentProps) {
  if (typeof cellData !== "number" || !Number.isFinite(cellData)) return <Empty />;
  return <span className="rn-admin-cell rn-admin-cell--figure">{formatKm(cellData)}</span>;
}

type YesNoProps = DefaultCellComponentProps & { yes?: string; no?: string };

/** A tick box as a word. */
export function YesNoCell({ cellData, yes = "Yes", no = "No" }: YesNoProps) {
  return <span className="rn-admin-cell">{cellData === true ? yes : no}</span>;
}

type StatusBadgeProps = DefaultCellComponentProps & {
  /** Option value to colour. Values not named here are neutral. */
  tones?: Record<string, BadgeTone>;
  /** Shorter words for the list than the form's option labels, where those are long. */
  labels?: Record<string, string>;
};

/**
 * A select value as a small badge. The words come from the field's own option label (or the
 * shorter one given here), so the colour is never the only sign of the status.
 */
export function StatusBadgeCell({ cellData, field, tones = {}, labels = {} }: StatusBadgeProps) {
  if (typeof cellData !== "string" || cellData.length === 0) return <Empty />;
  const options = field && "options" in field ? field.options : undefined;
  const text = labels[cellData] ?? optionLabel(options, cellData);
  const tone = tones[cellData] ?? "neutral";
  return <span className={`rn-admin-badge rn-admin-badge--${tone}`}>{text}</span>;
}
