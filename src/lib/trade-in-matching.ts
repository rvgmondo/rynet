import { MAX_DEALERSHIPS } from "@/lib/sell-to-dealer-schema";

/**
 * Choosing which dealerships get a seller's details.
 *
 * This is the code behind a promise the public site makes in writing, on the page and in the
 * consent record stored against every submission:
 *
 *   "verified dealerships in my province that buy this kind of vehicle ... no more than five"
 *
 * Every clause in that sentence is a rule below, and the tests assert each one separately.
 * A promise in a consent record that the code does not keep is worse than no promise: it is
 * evidence of the thing you failed to do.
 *
 * Kept as a pure function over plain data so it can be tested exhaustively without a database.
 * The job that reads the database and writes the disclosures is separate.
 */

export type MatchableDealer = {
  id: number;
  tradingName: string;
  verificationStatus?: string | null;
  /** A dealership only receives personal information if it has asked to. */
  acceptsTradeIns?: boolean | null;
  /** Empty means it will look at anything. */
  buysMakes?: { name?: string | null; aliases?: (string | null)[] | null }[] | null;
  /** Province slugs it has a branch in. */
  provinces: string[];
  /** How many trade-ins it has been sent recently, for the fairness rotation. */
  recentDisclosures?: number;
};

export type SellerVehicle = {
  make: string;
  provinceSlug: string;
};

/** Case, spacing and punctuation are all forgiven: this is free text a person typed. */
export const normaliseMake = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Does this dealership buy this make?
 *
 * Aliases matter more than they look. A seller types "VW", "Mercedes", "Merc" or "Chev", and a
 * dealership that plainly wants those cars would otherwise never be offered them. The
 * taxonomy already carries the aliases, so this uses them rather than inventing a synonym list.
 */
export function buysMake(dealer: MatchableDealer, sellerMake: string): boolean {
  const wanted = dealer.buysMakes ?? [];
  if (wanted.length === 0) return true;

  const target = normaliseMake(sellerMake);
  if (!target) return false;

  return wanted.some((make) => {
    if (make?.name && normaliseMake(make.name) === target) return true;
    return (make?.aliases ?? []).some((alias) => alias && normaliseMake(alias) === target);
  });
}

export function isEligible(dealer: MatchableDealer, vehicle: SellerVehicle): boolean {
  if (dealer.verificationStatus !== "verified") return false;
  if (!dealer.acceptsTradeIns) return false;
  if (!dealer.provinces.includes(vehicle.provinceSlug)) return false;
  return buysMake(dealer, vehicle.make);
}

/**
 * The dealerships that get this seller's details, in order.
 *
 * Ordered by how few trade-ins each has had recently, then by id for a stable tie-break. That
 * fairness rotation is not decoration: without it the same two dealerships would take every
 * lead in Gauteng forever, the rest would conclude the feature does nothing, and the seller
 * would get offers from a smaller pool than they were promised.
 *
 * Never returns more than `MAX_DEALERSHIPS`. That cap is in the consent wording, so it is a
 * commitment to the seller rather than a tuning knob.
 */
export function selectDealerships(
  dealers: readonly MatchableDealer[],
  vehicle: SellerVehicle,
  limit: number = MAX_DEALERSHIPS,
): MatchableDealer[] {
  return dealers
    .filter((dealer) => isEligible(dealer, vehicle))
    .sort((a, b) => (a.recentDisclosures ?? 0) - (b.recentDisclosures ?? 0) || a.id - b.id)
    .slice(0, Math.max(0, Math.min(limit, MAX_DEALERSHIPS)));
}
