import type { ElementType } from "react";

import { formatRand } from "@/lib/format";

/**
 * A price. "R 584 000": semibold, tabular figures, the R at the same size and weight as the
 * digits, and a real space after it, so a copied price and an announced price are both right.
 *
 *   sm  17px   dense lists, the sticky bar
 *   md  22px   vehicle cards
 *   lg  24 to 30px   panels, finance figures
 *   xl  30 to 40px   the asking price on a listing
 *
 * It never wraps. Every price on the platform is set through this (or through RandFigure, which
 * delegates here), and e2e/typography.spec.ts asserts `.rn-price` carries tabular-nums.
 */
export type PriceSize = "sm" | "md" | "lg" | "xl";

export function PriceTag({
  value,
  size = "lg",
  as: Tag = "p",
  className = "",
}: {
  value: number;
  size?: PriceSize;
  as?: ElementType;
  className?: string;
}) {
  return <Tag className={`rn-price rn-price--${size} ${className}`}>{formatRand(value)}</Tag>;
}
