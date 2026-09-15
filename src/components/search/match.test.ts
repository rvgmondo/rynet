import { describe, expect, it } from "vitest";

import {
  facetCounts,
  matches,
  NO_FILTERS,
  type ResolvedFilters,
  type StockRow,
  sortRows,
  summarise,
  tally,
} from "./match";

const TOYOTA = 1;
const FORD = 2;
const HILUX = 10;
const COROLLA = 11;
const RANGER = 20;
const BAKKIE = 100;
const HATCH = 101;
const GAUTENG = 500;
const WESTERN_CAPE = 501;

let next = 1;
const row = (overrides: Partial<StockRow>): StockRow => ({
  id: next++,
  make: TOYOTA,
  model: HILUX,
  variant: null,
  body: BAKKIE,
  fuel: 1,
  transmission: 1,
  colour: null,
  dealer: 1,
  city: 1,
  province: GAUTENG,
  condition: "pre_owned",
  price: 300000,
  year: 2020,
  mileage: 80000,
  publishedAt: "2026-09-01T00:00:00.000Z",
  demo: true,
  ...overrides,
});

const f = (overrides: Partial<ResolvedFilters>): ResolvedFilters => ({
  ...NO_FILTERS,
  ...overrides,
});

const hilux = row({});
const corolla = row({ model: COROLLA, body: HATCH, price: 250000, year: 2022, mileage: 30000 });
const ranger = row({
  make: FORD,
  model: RANGER,
  province: WESTERN_CAPE,
  price: 450000,
  condition: "new",
});
const stock = [hilux, corolla, ranger];

describe("matches", () => {
  it("matches everything with no filters, and nothing when the search box understood nothing", () => {
    expect(stock.every((r) => matches(r, NO_FILTERS))).toBe(true);
    expect(stock.some((r) => matches(r, f({ nothing: true })))).toBe(false);
  });

  it("keeps every car of a make with no model chosen under it", () => {
    const set = stock.filter((r) => matches(r, f({ openMakes: [TOYOTA] })));
    expect(set).toEqual([hilux, corolla]);
  });

  it("lets a buyer compare a Hilux and a Ranger in one search", () => {
    const set = stock.filter((r) => matches(r, f({ models: [HILUX, RANGER] })));
    expect(set).toEqual([hilux, ranger]);
  });

  it("applies price, year, mileage and condition as bounds", () => {
    expect(stock.filter((r) => matches(r, f({ maxPrice: 300000 })))).toEqual([hilux, corolla]);
    expect(stock.filter((r) => matches(r, f({ minYear: 2021 })))).toEqual([corolla]);
    expect(stock.filter((r) => matches(r, f({ maxMileage: 50000 })))).toEqual([corolla]);
    expect(stock.filter((r) => matches(r, f({ condition: "new" })))).toEqual([ranger]);
  });
});

describe("facetCounts", () => {
  it("counts each dimension against every filter except its own", () => {
    const counts = facetCounts(stock, f({ bodies: [BAKKIE], openMakes: [TOYOTA] }));
    // Make ignores the make filter but keeps the body filter: both bakkies.
    expect(counts.make[TOYOTA]).toBe(1);
    expect(counts.make[FORD]).toBe(1);
    // Body ignores the body filter but keeps the make filter: the two Toyotas.
    expect(counts.body[BAKKIE]).toBe(1);
    expect(counts.body[HATCH]).toBe(1);
    // Province keeps both.
    expect(counts.province[GAUTENG]).toBe(1);
    expect(counts.province[WESTERN_CAPE]).toBeUndefined();
  });

  it("counts cars under each mileage ceiling and per condition", () => {
    const counts = facetCounts(stock, NO_FILTERS);
    expect(counts.mileage[50000]).toBe(1);
    expect(counts.mileage[100000]).toBe(3);
    expect(counts.condition.pre_owned).toBe(2);
    expect(counts.condition.new).toBe(1);
  });
});

describe("sortRows", () => {
  it("orders by price both ways and by mileage", () => {
    expect(sortRows(stock, "price-asc").map((r) => r.price)).toEqual([250000, 300000, 450000]);
    expect(sortRows(stock, "price-desc").map((r) => r.price)).toEqual([450000, 300000, 250000]);
    expect(sortRows(stock, "mileage")[0]).toBe(corolla);
  });

  it("does not reorder the array it was given", () => {
    const before = [...stock];
    sortRows(stock, "price-desc");
    expect(stock).toEqual(before);
  });
});

describe("summarise and tally", () => {
  it("states only what the set holds", () => {
    const summary = summarise(stock);
    expect(summary).toMatchObject({
      total: 3,
      demo: 3,
      minPrice: 250000,
      maxPrice: 450000,
      minYear: 2020,
      maxYear: 2022,
      dealers: 1,
      provinces: 2,
    });
    expect(summarise([]).minPrice).toBeNull();
  });

  it("ranks values by how many cars carry them", () => {
    expect(tally(stock, "make")).toEqual([
      [TOYOTA, 2],
      [FORD, 1],
    ]);
  });
});
