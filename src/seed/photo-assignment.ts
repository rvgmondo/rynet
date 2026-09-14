/**
 * Which demonstration photograph each seeded listing gets.
 *
 * WHY THIS IS NOT "ONE PHOTOGRAPH PER MODEL"
 *
 * It was, and the audit found the same black Hilux in the same parking bay on eleven cards of
 * the bakkie page, twice side by side on a phone, and the same white Polo on two neighbouring
 * cards where the pair read as one stretched picture. A results grid made of one repeated
 * photograph reads as a template filled with stock art, which is the precise impression the
 * photography was brought in to remove.
 *
 * So each model now has up to four photographs of different cars, and this decides between
 * them. It is a pure function so the rules can be tested without a database.
 *
 * THE RULES, IN ORDER OF WEIGHT
 *
 * 1. Never the photograph the previous listing of this model used, in the order the search
 *    page shows them. That is what puts two identical pictures next to each other.
 * 2. Spread across one dealership's own stock, because a dealership page shows nothing else.
 * 3. Prefer a photograph in the listing's own colour family. A red Hilux listing illustrated
 *    with a red Hilux is simply less jarring, and the caption still says it is the model and
 *    not the car.
 * 4. Otherwise the least used, so the four share the load.
 * 5. Ties break on a stable hash of the public reference, so the same seed gives the same
 *    answer on every machine.
 */

export type PhotoOption = {
  /** Anything that identifies the photograph, typically the manifest file name. */
  id: string;
  /** Colour family, matching Colours.family: white, silver, grey, black, red, blue and so on. */
  colour: string | null;
};

export type ListingForPhoto = {
  id: number;
  publicRef: string;
  dealerId: number | null;
  colourFamily: string | null;
};

const SAME_AS_PREVIOUS = 1000;
const PER_DEALER_REPEAT = 12;
const WRONG_COLOUR = 5;
const PER_USE = 1;

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param listings listings of ONE model, already in the order the search page shows them
 * @param photos the photographs available for that model
 * @returns listing id to photograph id; a listing is absent only when there are no photos
 */
export function assignPhotos(
  listings: ListingForPhoto[],
  photos: PhotoOption[],
): Map<number, string> {
  const out = new Map<number, string>();
  if (photos.length === 0) return out;

  const uses = new Map<string, number>();
  const dealerUses = new Map<string, number>();
  let previous: string | null = null;

  for (const listing of listings) {
    let best: PhotoOption | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    let bestTie = 0;

    for (const photo of photos) {
      const dealerKey = `${listing.dealerId ?? "none"}|${photo.id}`;
      let cost = (uses.get(photo.id) ?? 0) * PER_USE;
      cost += (dealerUses.get(dealerKey) ?? 0) * PER_DEALER_REPEAT;
      if (photo.id === previous && photos.length > 1) cost += SAME_AS_PREVIOUS;
      if (listing.colourFamily && photo.colour !== listing.colourFamily) cost += WRONG_COLOUR;

      const tie = hash(`${listing.publicRef}|${photo.id}`);
      if (cost < bestCost || (cost === bestCost && tie < bestTie)) {
        best = photo;
        bestCost = cost;
        bestTie = tie;
      }
    }

    if (!best) continue;
    out.set(listing.id, best.id);
    uses.set(best.id, (uses.get(best.id) ?? 0) + 1);
    const dealerKey = `${listing.dealerId ?? "none"}|${best.id}`;
    dealerUses.set(dealerKey, (dealerUses.get(dealerKey) ?? 0) + 1);
    previous = best.id;
  }

  return out;
}
