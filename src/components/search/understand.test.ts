import { describe, expect, it } from "vitest";

import { parseQuery, type Taxonomies } from "@/lib/query-parse";

import { NO_FILTERS, type ResolvedFilters, type StockRow } from "./match";
import type { Taxonomy } from "./stock";
import { closeCallCandidates, replacePhrase, sayBack } from "./understand";

const CORPUS: Taxonomies = {
  makes: [
    { name: "Toyota", slug: "toyota", aliases: [] },
    { name: "Ford", slug: "ford", aliases: [] },
  ],
  models: [
    { name: "Hilux", slug: "hilux", aliases: [] },
    { name: "Ranger", slug: "ranger", aliases: [] },
  ],
  bodyTypes: [{ name: "Bakkie", slug: "bakkie", aliases: [] }],
  fuelTypes: [{ name: "Diesel", slug: "diesel", aliases: [] }],
  transmissions: [{ name: "Automatic", slug: "automatic", aliases: ["auto"] }],
  provinces: [],
  cities: [],
};

const TAXONOMY: Taxonomy = {
  makes: [
    { id: 1, name: "Toyota", slug: "toyota", active: true },
    { id: 2, name: "Ford", slug: "ford", active: true },
  ],
  models: [
    { id: 10, name: "Hilux", slug: "hilux", make: 1 },
    { id: 20, name: "Ranger", slug: "ranger", make: 2 },
  ],
  bodies: [{ id: 5, name: "Bakkie", slug: "bakkie" }],
  fuels: [{ id: 7, name: "Diesel", slug: "diesel" }],
  transmissions: [{ id: 9, name: "Automatic", slug: "automatic" }],
  provinces: [],
  cities: [],
  colours: [],
  variants: [],
};

const row = (over: Partial<StockRow>): StockRow => ({
  id: 1,
  make: 2,
  model: 20,
  variant: null,
  body: 5,
  fuel: 7,
  transmission: 9,
  colour: null,
  dealer: 1,
  city: null,
  province: null,
  condition: "pre_owned",
  price: 300_000,
  year: 2020,
  mileage: 90_000,
  publishedAt: null,
  demo: false,
  ...over,
});

// Three Rangers and no Hilux at all.
const ROWS = [
  row({ id: 1, price: 240_000, year: 2018, mileage: 160_000 }),
  row({ id: 2, price: 279_900, year: 2021, mileage: 120_000 }),
  row({ id: 3, price: 349_900, year: 2022, mileage: 60_000, transmission: null }),
];

describe("replacePhrase", () => {
  it("finds the words however the box spells them", () => {
    expect(replacePhrase("Diesel bakkie under R 200 000", "under r200000", "under R 250 000")).toBe(
      "Diesel bakkie under R 250 000",
    );
    expect(replacePhrase("VW, Polo", "vw", "")).toBe("Polo");
    expect(replacePhrase("automatic diesel", "automatic", "")).toBe("diesel");
  });

  it("never edits inside another word", () => {
    expect(replacePhrase("autobahn auto", "auto", "")).toBe("autobahn");
  });
});

describe("sayBack", () => {
  it("names what it understood, and owns up to a model nobody lists", () => {
    const parsed = parseQuery("hilux under 300", CORPUS);
    const chips = sayBack(parsed, TAXONOMY, ROWS);
    expect(chips.map((c) => c.label)).toEqual(["Under R 300 000", "No Toyota Hilux listed yet"]);
    expect(chips[1]?.unstocked).toBe(true);
  });

  it("folds a make into its model, so Ford Ranger is one chip that removes both words", () => {
    const chips = sayBack(parseQuery("ford ranger diesel", CORPUS), TAXONOMY, ROWS);
    expect(chips.map((c) => c.label)).toEqual(["Ford Ranger", "Diesel"]);
    expect(chips[0]?.also).toEqual(["ford"]);
  });

  it("says what the buyer actually typed when it read a slip", () => {
    const chips = sayBack(parseQuery("rangr", CORPUS), TAXONOMY, ROWS);
    expect(chips[0]).toMatchObject({ label: "Ford Ranger", hint: 'you typed "rangr"' });
  });
});

describe("closeCallCandidates", () => {
  const filtersFor = (over: Partial<ResolvedFilters>): ResolvedFilters => ({
    ...NO_FILTERS,
    ...over,
  });

  it("stretches a price ceiling to the nearest car past it, rounded the way people say it", () => {
    const text = "diesel bakkie under 200k";
    const calls = closeCallCandidates(
      text,
      parseQuery(text, CORPUS),
      filtersFor({ fuels: [7], bodies: [5], maxPrice: 200_000 }),
      ROWS,
      TAXONOMY,
    );
    expect(calls[0]).toEqual({
      label: "Stretch to R 240 000",
      text: "diesel bakkie under R 240 000",
    });
  });

  it("offers higher mileage and older years the same way", () => {
    const km = "ranger 2022 or newer under 50 000 km";
    const kmCalls = closeCallCandidates(
      km,
      parseQuery(km, CORPUS),
      filtersFor({ models: [20], minYear: 2022, maxMileage: 50_000 }),
      ROWS,
      TAXONOMY,
    );
    expect(kmCalls[0]).toEqual({
      label: "Allow up to 60 000 km",
      text: "ranger 2022 or newer under 60 000 km",
    });
    const year = "ranger 2023 or newer";
    const yearCalls = closeCallCandidates(
      year,
      parseQuery(year, CORPUS),
      filtersFor({ models: [20], minYear: 2023 }),
      ROWS,
      TAXONOMY,
    );
    expect(yearCalls[0]).toEqual({ label: "Include 2022 models", text: "ranger 2022 or newer" });
  });

  it("turns a model nobody lists into its make", () => {
    const text = "hilux automatic";
    const calls = closeCallCandidates(
      text,
      parseQuery(text, CORPUS),
      filtersFor({ models: [10], transmissions: [9] }),
      ROWS,
      TAXONOMY,
    );
    expect(calls).toContainEqual({
      label: "Any Toyota, not just the Hilux",
      text: "Toyota automatic",
    });
    expect(calls).toContainEqual({ label: "Any gearbox, not just Automatic", text: "hilux" });
  });

  it("converts a stretched monthly budget back into a monthly figure", () => {
    const text = "bakkie R3000 a month";
    const parsed = parseQuery(text, CORPUS);
    const calls = closeCallCandidates(
      text,
      parsed,
      filtersFor({ bodies: [5], maxPrice: 150_000 }),
      ROWS,
      TAXONOMY,
      (price) => price / 50,
    );
    expect(calls[0]).toEqual({
      label: "Stretch to R 4 800 a month",
      text: "bakkie R 4 800 a month",
    });
  });
});
