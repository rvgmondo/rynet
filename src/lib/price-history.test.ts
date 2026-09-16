import { describe, expect, it } from "vitest";

import { priceFieldsFromSaved } from "./price-history";

const NOW = new Date("2026-09-16T12:00:00.000Z");

describe("priceFieldsFromSaved", () => {
  const saved = {
    price: 300000,
    previousPrice: 310000,
    priceHistory: [{ id: "a", price: 300000, changedAt: "2026-09-01T00:00:00.000Z" }],
  };

  it("records a change against the saved price, once", () => {
    expect(priceFieldsFromSaved(saved, 285000, NOW)).toEqual({
      previousPrice: 300000,
      priceHistory: [
        { id: "a", price: 300000, changedAt: "2026-09-01T00:00:00.000Z" },
        { price: 285000, changedAt: NOW.toISOString() },
      ],
    });
  });

  it("ignores whatever a draft did in between", () => {
    // However many half-typed prices autosave kept, only the saved car counts.
    const result = priceFieldsFromSaved(saved, 285000, NOW);
    expect(result.previousPrice).toBe(300000);
    expect(result.priceHistory).toHaveLength(2);
  });

  it("keeps the saved fields when the price is back to the saved one", () => {
    expect(priceFieldsFromSaved(saved, 300000, NOW)).toEqual({
      previousPrice: 310000,
      priceHistory: saved.priceHistory,
    });
  });

  it("treats a missing price as no change", () => {
    expect(priceFieldsFromSaved({ price: null }, 250000, NOW)).toEqual({
      previousPrice: null,
      priceHistory: [],
    });
    expect(priceFieldsFromSaved(saved, undefined, NOW).previousPrice).toBe(310000);
  });
});
