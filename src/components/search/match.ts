import { MILEAGE_STEPS, type SortKey } from "./params";

/**
 * The matching rules, once.
 *
 * A search is answered from a compact row per live car (stock.ts loads and caches them), so the
 * results, the total, the demonstration count, every facet count in the rail and the live
 * "Show 42 cars" count all come out of the same predicate. There used to be three: a where clause
 * on /cars, another in lib/search.ts for the landing pages, and a hundred count queries in the
 * rail, and they disagreed about what a price filter or a province meant.
 *
 * Pure and unit tested (match.test.ts). No database.
 *
 * SCALE. Filtering a few hundred rows in memory takes well under a millisecond. The trigger to move
 * this into the denormalised index table in docs/ARCHITECTURE.md is the one already written down
 * there: p95 above 300ms at 50 concurrent, or 250 000 live listings.
 */

export type StockRow = {
  id: number;
  make: number | null;
  model: number | null;
  variant: number | null;
  body: number | null;
  fuel: number | null;
  transmission: number | null;
  colour: number | null;
  dealer: number | null;
  city: number | null;
  province: number | null;
  condition: string | null;
  price: number;
  year: number;
  mileage: number;
  publishedAt: string | null;
  demo: boolean;
};

/** A search with every slug resolved to an id. Empty arrays mean "not filtered". */
export type ResolvedFilters = {
  /** True when the buyer typed something and none of it meant anything. Matches nothing. */
  nothing: boolean;
  /** Makes with no model chosen under them: every car of that make matches. */
  openMakes: number[];
  /** Chosen models: every car of that model matches, whatever else is chosen. */
  models: number[];
  bodies: number[];
  fuels: number[];
  transmissions: number[];
  provinces: number[];
  cities: number[];
  colour: number | null;
  variant: number | null;
  condition: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxYear: number | null;
  maxMileage: number | null;
};

/** A facet dimension, for "every filter except this one". Make and model are one dimension. */
export type Dimension =
  | "make"
  | "body"
  | "fuel"
  | "transmission"
  | "province"
  | "mileage"
  | "condition";

export const NO_FILTERS: ResolvedFilters = {
  nothing: false,
  openMakes: [],
  models: [],
  bodies: [],
  fuels: [],
  transmissions: [],
  provinces: [],
  cities: [],
  colour: null,
  variant: null,
  condition: null,
  minPrice: null,
  maxPrice: null,
  minYear: null,
  maxYear: null,
  maxMileage: null,
};

const within = (list: number[], value: number | null) =>
  list.length === 0 || (value !== null && list.includes(value));

export function matches(row: StockRow, f: ResolvedFilters, except?: Dimension): boolean {
  if (f.nothing) return false;

  if (except !== "make" && (f.openMakes.length > 0 || f.models.length > 0)) {
    const byModel = row.model !== null && f.models.includes(row.model);
    const byMake = row.make !== null && f.openMakes.includes(row.make);
    if (!byModel && !byMake) return false;
  }
  if (except !== "body" && !within(f.bodies, row.body)) return false;
  if (except !== "fuel" && !within(f.fuels, row.fuel)) return false;
  if (except !== "transmission" && !within(f.transmissions, row.transmission)) return false;
  if (except !== "province" && !within(f.provinces, row.province)) return false;
  if (except !== "mileage" && f.maxMileage !== null && row.mileage > f.maxMileage) return false;

  if (!within(f.cities, row.city)) return false;
  if (f.colour !== null && row.colour !== f.colour) return false;
  if (f.variant !== null && row.variant !== f.variant) return false;
  if (except !== "condition" && f.condition !== null && row.condition !== f.condition) return false;
  if (f.minPrice !== null && row.price < f.minPrice) return false;
  if (f.maxPrice !== null && row.price > f.maxPrice) return false;
  if (f.minYear !== null && row.year < f.minYear) return false;
  if (f.maxYear !== null && row.year > f.maxYear) return false;
  return true;
}

export type FacetCounts = {
  make: Record<number, number>;
  model: Record<number, number>;
  body: Record<number, number>;
  fuel: Record<number, number>;
  transmission: Record<number, number>;
  province: Record<number, number>;
  /** Cars at or under each mileage ceiling in MILEAGE_STEPS. */
  mileage: Record<number, number>;
  /** Cars per condition value: new, demo (ex-demo stock) and pre_owned. */
  condition: Record<string, number>;
};

const bump = (tally: Record<number, number>, key: number | null) => {
  if (key === null) return;
  tally[key] = (tally[key] ?? 0) + 1;
};

/**
 * Counts per option, each against the set filtered by everything EXCEPT its own dimension.
 *
 * That is the standard facet rule: ticking Toyota must not collapse the make list to Toyota, and a
 * count beside Diesel must be the number of cars ticking Diesel would leave. Every other filter
 * applies, which is what makes the number worth trusting.
 */
export function facetCounts(rows: StockRow[], f: ResolvedFilters): FacetCounts {
  const out: FacetCounts = {
    make: {},
    model: {},
    body: {},
    fuel: {},
    transmission: {},
    province: {},
    mileage: {},
    condition: {},
  };
  for (const step of MILEAGE_STEPS) out.mileage[step] = 0;

  for (const row of rows) {
    if (matches(row, f, "make")) {
      bump(out.make, row.make);
      bump(out.model, row.model);
    }
    if (matches(row, f, "body")) bump(out.body, row.body);
    if (matches(row, f, "fuel")) bump(out.fuel, row.fuel);
    if (matches(row, f, "transmission")) bump(out.transmission, row.transmission);
    if (matches(row, f, "province")) bump(out.province, row.province);
    if (matches(row, f, "mileage")) {
      for (const step of MILEAGE_STEPS) {
        if (row.mileage <= step) out.mileage[step] = (out.mileage[step] ?? 0) + 1;
      }
    }
    if (row.condition !== null && matches(row, f, "condition")) {
      out.condition[row.condition] = (out.condition[row.condition] ?? 0) + 1;
    }
  }
  return out;
}

const newestFirst = (a: StockRow, b: StockRow) =>
  (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.id - a.id;

/** The five orders the sort control offers. Ties fall back to newest listed, then to id. */
export function sortRows(rows: StockRow[], sort: SortKey): StockRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price || newestFirst(a, b));
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price || newestFirst(a, b));
    case "mileage":
      return sorted.sort((a, b) => a.mileage - b.mileage || newestFirst(a, b));
    case "year":
      return sorted.sort((a, b) => b.year - a.year || newestFirst(a, b));
    default:
      return sorted.sort(newestFirst);
  }
}

export type SetSummary = {
  total: number;
  demo: number;
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxYear: number | null;
  dealers: number;
  provinces: number;
};

/** The facts a landing page can state about its own set, and nothing it cannot. */
export function summarise(rows: StockRow[]): SetSummary {
  const dealers = new Set<number>();
  const provinces = new Set<number>();
  let demo = 0;
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let minYear: number | null = null;
  let maxYear: number | null = null;

  for (const row of rows) {
    if (row.demo) demo += 1;
    if (row.dealer !== null) dealers.add(row.dealer);
    if (row.province !== null) provinces.add(row.province);
    minPrice = minPrice === null ? row.price : Math.min(minPrice, row.price);
    maxPrice = maxPrice === null ? row.price : Math.max(maxPrice, row.price);
    minYear = minYear === null ? row.year : Math.min(minYear, row.year);
    maxYear = maxYear === null ? row.year : Math.max(maxYear, row.year);
  }

  return {
    total: rows.length,
    demo,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    dealers: dealers.size,
    provinces: provinces.size,
  };
}

/** How many rows fall under each value of one field, most first, for "popular models" links. */
export function tally(rows: StockRow[], field: "make" | "model" | "variant" | "city" | "province") {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const key = row[field];
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
}
