import { describe, expect, it } from "vitest";

import { MAX_DEALERSHIPS } from "./sell-to-dealer-schema";
import {
  buysMake,
  isEligible,
  type MatchableDealer,
  normaliseMake,
  selectDealerships,
} from "./trade-in-matching";

/**
 * The consent record stored against every sell-to-a-dealer submission says, word for word:
 *
 *   "a shortlist of verified dealerships in my province that buy this kind of vehicle"
 *
 * Each clause of that sentence gets its own test here. A promise in a consent record that the
 * code does not keep is worse than making no promise at all, because the record is evidence of
 * exactly what you undertook to do.
 *
 * The seller is never shown a number. `MAX_DEALERSHIPS` is the ceiling that makes "a shortlist"
 * a true word, so it is tested here rather than read anywhere a seller can see it.
 */

const dealer = (over: Partial<MatchableDealer> = {}): MatchableDealer => ({
  id: 1,
  tradingName: "Test Motors",
  verificationStatus: "verified",
  acceptsTradeIns: true,
  buysMakes: [],
  provinces: ["gauteng"],
  ...over,
});

const hilux = { make: "Toyota", provinceSlug: "gauteng" };

describe('"verified dealerships"', () => {
  it("only a verified dealership receives anything", () => {
    for (const status of ["pending", "suspended", "archived", null, undefined]) {
      expect(isEligible(dealer({ verificationStatus: status }), hilux), String(status)).toBe(false);
    }
    expect(isEligible(dealer({ verificationStatus: "verified" }), hilux)).toBe(true);
  });

  it("a demonstration dealership never receives a real seller's details", () => {
    // Seeded example dealerships are verified and accept trade-ins so the public site has
    // something to show. They are not businesses, so personal information must never reach one.
    expect(isEligible(dealer({ isDemonstration: true }), hilux)).toBe(false);
    expect(isEligible(dealer({ isDemonstration: false }), hilux)).toBe(true);
    expect(
      selectDealerships(
        [dealer({ id: 1, isDemonstration: true }), dealer({ id: 2, isDemonstration: true })],
        hilux,
      ),
    ).toEqual([]);
  });

  it("a dealership that has not asked for trade-ins receives nothing", () => {
    // Personal information does not go to a business that never opted in to receive it,
    // whatever its verification status.
    expect(isEligible(dealer({ acceptsTradeIns: false }), hilux)).toBe(false);
    expect(isEligible(dealer({ acceptsTradeIns: null }), hilux)).toBe(false);
    expect(isEligible(dealer({ acceptsTradeIns: undefined }), hilux)).toBe(false);
  });
});

describe('"in my province"', () => {
  it("a dealership with no branch in the seller's province is skipped", () => {
    expect(isEligible(dealer({ provinces: ["western-cape"] }), hilux)).toBe(false);
  });

  it("one branch in the right province is enough", () => {
    expect(
      isEligible(dealer({ provinces: ["western-cape", "gauteng", "free-state"] }), hilux),
    ).toBe(true);
  });

  it("a dealership with no branches at all is skipped", () => {
    expect(isEligible(dealer({ provinces: [] }), hilux)).toBe(false);
  });
});

describe('"that buy this kind of vehicle"', () => {
  it("an empty list means it will look at anything", () => {
    expect(buysMake(dealer({ buysMakes: [] }), "Toyota")).toBe(true);
    expect(buysMake(dealer({ buysMakes: null }), "Lamborghini")).toBe(true);
  });

  it("matches the make by name, however it was typed", () => {
    const d = dealer({ buysMakes: [{ name: "Toyota", aliases: [] }] });
    for (const typed of ["Toyota", "toyota", "TOYOTA", " Toyota ", "toy ota"]) {
      expect(buysMake(d, typed), typed).toBe(true);
    }
  });

  it("matches an alias, which is how a real person types a make", () => {
    // Nobody selling a Golf types "Volkswagen".
    const d = dealer({
      buysMakes: [{ name: "Volkswagen", aliases: ["VW", "Volks"] }],
    });
    expect(buysMake(d, "VW")).toBe(true);
    expect(buysMake(d, "vw")).toBe(true);
    expect(buysMake(d, "Volks")).toBe(true);
    expect(buysMake(d, "Volkswagen")).toBe(true);
  });

  it("refuses a make it does not buy", () => {
    const d = dealer({ buysMakes: [{ name: "Toyota", aliases: [] }] });
    expect(buysMake(d, "Ferrari")).toBe(false);
    expect(buysMake(d, "")).toBe(false);
    expect(buysMake(d, "   ")).toBe(false);
  });

  it("does not match on a substring", () => {
    // "Ford" must not match a dealership that buys "Ford Trucks Only" or similar, and
    // "BM" must not match "BMW".
    const d = dealer({ buysMakes: [{ name: "BMW", aliases: [] }] });
    expect(buysMake(d, "BM")).toBe(false);
    expect(buysMake(d, "BMWX")).toBe(false);
  });
});

describe('"a shortlist"', () => {
  const many = Array.from({ length: 20 }, (_, i) => dealer({ id: i + 1 }));

  it("keeps the ceiling every recorded consent was given under", () => {
    // Consents recorded under 2026-08-privacy-v1 and 2026-09-privacy-v2 say "no more than 5"
    // in so many words. Raising this would send those sellers' details to a dealership they
    // never agreed to, so the ceiling cannot move until the distribution job keeps those
    // leads at five on its own.
    expect(MAX_DEALERSHIPS).toBeLessThanOrEqual(5);
  });

  it("never returns more than the cap, whatever is eligible", () => {
    expect(selectDealerships(many, hilux)).toHaveLength(MAX_DEALERSHIPS);
  });

  it("the cap cannot be raised by passing a bigger limit", () => {
    // The ceiling is what makes "a shortlist" true, so it is a commitment to the seller rather
    // than a tuning knob a caller gets to override.
    expect(selectDealerships(many, hilux, 50)).toHaveLength(MAX_DEALERSHIPS);
  });

  it("a smaller limit is honoured", () => {
    expect(selectDealerships(many, hilux, 2)).toHaveLength(2);
  });

  it("returns nothing rather than something when nobody is eligible", () => {
    expect(selectDealerships(many, { make: "Toyota", provinceSlug: "limpopo" })).toEqual([]);
    expect(selectDealerships([], hilux)).toEqual([]);
  });
});

describe("fairness", () => {
  it("prefers the dealerships that have had the fewest recently", () => {
    // Without this the same two dealerships take every lead in Gauteng, everyone else decides
    // the feature does nothing, and the seller hears from a smaller pool than they were told.
    const dealers = [
      dealer({ id: 1, recentDisclosures: 40 }),
      dealer({ id: 2, recentDisclosures: 0 }),
      dealer({ id: 3, recentDisclosures: 7 }),
    ];
    expect(selectDealerships(dealers, hilux).map((d) => d.id)).toEqual([2, 3, 1]);
  });

  it("breaks a tie by id, so the same input always gives the same answer", () => {
    const dealers = [
      dealer({ id: 9, recentDisclosures: 3 }),
      dealer({ id: 2, recentDisclosures: 3 }),
      dealer({ id: 5, recentDisclosures: 3 }),
    ];
    expect(selectDealerships(dealers, hilux).map((d) => d.id)).toEqual([2, 5, 9]);
  });

  it("does not mutate the list it was given", () => {
    const dealers = [dealer({ id: 3 }), dealer({ id: 1 }), dealer({ id: 2 })];
    const before = dealers.map((d) => d.id);
    selectDealerships(dealers, hilux);
    expect(dealers.map((d) => d.id)).toEqual(before);
  });
});

describe("normaliseMake", () => {
  it("strips everything a person might type around the name", () => {
    expect(normaliseMake("Mercedes-Benz")).toBe("mercedesbenz");
    expect(normaliseMake("  land rover ")).toBe("landrover");
    expect(normaliseMake("VW!")).toBe("vw");
  });
});
