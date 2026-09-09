import { describe, expect, it } from "vitest";

import { extractPrice, parseQuery, type Taxonomies } from "./query-parse";

/**
 * The queries a South African actually types.
 *
 * These are not synthetic cases. "bakkie under 300" is the single most likely first search
 * on this platform, and every alias below is one that is genuinely seeded in
 * src/seed/data/taxonomies.ts rather than one invented to make a test pass.
 */
const TAXONOMIES: Taxonomies = {
  makes: [
    { name: "Toyota", slug: "toyota", aliases: [] },
    { name: "Volkswagen", slug: "volkswagen", aliases: ["vw", "volks"] },
    { name: "Isuzu", slug: "isuzu", aliases: [] },
  ],
  models: [
    { name: "Hilux", slug: "hilux", aliases: [] },
    { name: "Polo Vivo", slug: "polo-vivo", aliases: ["vivo"] },
    { name: "Polo", slug: "polo", aliases: [] },
  ],
  bodyTypes: [
    { name: "Bakkie", slug: "bakkie", aliases: ["pickup", "double cab", "single cab"] },
    { name: "SUV", slug: "suv", aliases: ["4x4"] },
    { name: "Hatchback", slug: "hatchback", aliases: ["hatch"] },
  ],
  fuelTypes: [
    { name: "Diesel", slug: "diesel", aliases: [] },
    { name: "Petrol", slug: "petrol", aliases: [] },
  ],
  transmissions: [
    { name: "Automatic", slug: "automatic", aliases: ["auto", "at"] },
    { name: "Manual", slug: "manual", aliases: ["mt"] },
  ],
  provinces: [
    { name: "Gauteng", slug: "gauteng", aliases: ["gp", "jhb", "joburg", "pta"] },
    { name: "Western Cape", slug: "western-cape", aliases: ["wc", "cape town", "cpt"] },
  ],
  cities: [
    { name: "Pretoria", slug: "pretoria", aliases: ["tshwane"] },
    { name: "Cape Town", slug: "cape-town", aliases: [] },
  ],
};

describe("extractPrice", () => {
  it("reads a bare number in a price phrase as thousands, because nobody means R300", () => {
    expect(extractPrice("bakkie under 300").maxPrice).toBe(300_000);
    expect(extractPrice("under 300k").maxPrice).toBe(300_000);
    expect(extractPrice("under r300 000").maxPrice).toBe(300_000);
    expect(extractPrice("under 300000").maxPrice).toBe(300_000);
  });

  it("understands every way of saying a ceiling", () => {
    for (const phrase of ["under 400", "below 400", "less than 400", "up to 400", "max 400"]) {
      expect(extractPrice(phrase).maxPrice, phrase).toBe(400_000);
    }
  });

  it("understands a floor", () => {
    expect(extractPrice("over 150k").minPrice).toBe(150_000);
    expect(extractPrice("from 150").minPrice).toBe(150_000);
  });

  it("reads a range", () => {
    const { minPrice, maxPrice } = extractPrice("over 100 under 250");
    expect(minPrice).toBe(100_000);
    expect(maxPrice).toBe(250_000);
  });

  it("removes the phrase it consumed", () => {
    // Load-bearing. Leaving it in means "under" goes looking for a make called under.
    expect(extractPrice("bakkie under 300").rest).toBe("bakkie");
  });

  it("leaves a query with no price alone", () => {
    const result = extractPrice("toyota hilux");
    expect(result.rest).toBe("toyota hilux");
    expect(result.maxPrice).toBeUndefined();
  });
});

describe("parseQuery", () => {
  it("handles the most likely first search on the platform", () => {
    const result = parseQuery("bakkie under 300", TAXONOMIES);
    expect(result.body).toBe("bakkie");
    expect(result.maxPrice).toBe(300_000);
    expect(result.unmatched).toEqual([]);
  });

  it("resolves a make alias the way people type it", () => {
    expect(parseQuery("vw polo", TAXONOMIES).make).toBe("volkswagen");
    expect(parseQuery("VW Polo", TAXONOMIES).model).toBe("polo");
  });

  it("prefers the longer name, so Polo Vivo never resolves to Polo", () => {
    expect(parseQuery("polo vivo", TAXONOMIES).model).toBe("polo-vivo");
    expect(parseQuery("polo", TAXONOMIES).model).toBe("polo");
  });

  it("prefers the longer place, so Western Cape never resolves to Cape Town", () => {
    expect(parseQuery("western cape", TAXONOMIES).province).toBe("western-cape");
  });

  it("drops the province when a city already implies it", () => {
    // Otherwise the same fact filters twice and one of the two clauses is redundant.
    const result = parseQuery("hilux cape town", TAXONOMIES);
    expect(result.city).toBe("cape-town");
    expect(result.province).toBeUndefined();
  });

  it("reads a full sentence of a query", () => {
    const result = parseQuery(
      "toyota hilux double cab diesel automatic gauteng under 500",
      TAXONOMIES,
    );
    expect(result).toMatchObject({
      make: "toyota",
      model: "hilux",
      body: "bakkie",
      fuel: "diesel",
      transmission: "automatic",
      province: "gauteng",
      maxPrice: 500_000,
    });
    expect(result.unmatched).toEqual([]);
  });

  it("consumes each word once", () => {
    // "auto" must not resolve to a transmission and then remain available to match again.
    const result = parseQuery("auto", TAXONOMIES);
    expect(result.transmission).toBe("automatic");
    expect(result.unmatched).toEqual([]);
  });

  it("hands back what it did not understand rather than swallowing it", () => {
    const result = parseQuery("toyota fortuner legend 50", TAXONOMIES);
    expect(result.make).toBe("toyota");
    expect(result.unmatched).toEqual(["fortuner", "legend", "50"]);
  });

  it("is case and punctuation insensitive", () => {
    expect(parseQuery("  TOYOTA,  Hilux!  ", TAXONOMIES)).toMatchObject({
      make: "toyota",
      model: "hilux",
    });
  });

  it("returns nothing for an empty query rather than throwing", () => {
    for (const empty of [undefined, null, "", "   "]) {
      const result = parseQuery(empty, TAXONOMIES);
      expect(result.matched).toEqual([]);
      expect(result.unmatched).toEqual([]);
    }
  });

  it("only ever takes one value per dimension", () => {
    const result = parseQuery("toyota volkswagen", TAXONOMIES);
    expect(result.make).toBe("toyota");
    expect(result.unmatched).toEqual(["volkswagen"]);
  });
});
