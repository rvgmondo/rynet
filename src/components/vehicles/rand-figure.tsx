import { type PriceSize, PriceTag } from "@/components/ui/price-tag";

/**
 * A rand amount. Kept as the name the listing page, the price rail and the finance panel already
 * import, and drawn by PriceTag: "R 584 000", semibold, tabular, the R at the same size as the
 * digits and a real space after it.
 *
 * The previous figure shrank the R to 0.58em in grey and narrowed the space with negative
 * letter-spacing, which read as "R584 000", and sized itself from its container through a
 * measured character model. A 600-weight price at a fixed step does not need either: it fits a
 * 248px card at 22px with room to spare.
 */
export function RandFigure({
  value,
  size = "lg",
  className = "",
}: {
  value: number;
  size?: PriceSize;
  className?: string;
}) {
  return <PriceTag value={value} size={size} className={className} />;
}
