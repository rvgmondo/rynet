/**
 * A car's previous price and price history, worked out from the car the SITE shows.
 *
 * Used by the vehicles hook that runs after every update, drafts included. Measuring against the
 * saved car, not against the latest draft autosave kept, is what stops a half-typed price from
 * becoming the "previous price" behind a price-drop badge. Pure, so it can be tested alone.
 */

export type PriceHistoryEntry = {
  id?: string | null;
  price?: number | null;
  changedAt?: string | null;
};

export type SavedPrices = {
  price?: number | null;
  previousPrice?: number | null;
  priceHistory?: PriceHistoryEntry[] | null;
};

export function priceFieldsFromSaved(
  saved: SavedPrices,
  newPrice: unknown,
  now: Date = new Date(),
): { previousPrice: number | null; priceHistory: PriceHistoryEntry[] } {
  const history = Array.isArray(saved.priceHistory) ? saved.priceHistory : [];
  if (typeof saved.price === "number" && typeof newPrice === "number" && saved.price !== newPrice) {
    // A real change: one entry, appended to what the saved car already has.
    return {
      previousPrice: saved.price,
      priceHistory: [...history, { price: newPrice, changedAt: now.toISOString() }],
    };
  }
  // No change against the saved car: both stay exactly as the saved car has them.
  return { previousPrice: saved.previousPrice ?? null, priceHistory: history };
}
