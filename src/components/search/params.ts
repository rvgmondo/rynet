/**
 * What a search asks for, read from a URL and written back to one.
 *
 * Pure on purpose: no database, no framework. Both search pages, the filter form, the sort form,
 * the removable chips and the live count read the same shape through these functions, so a filter
 * cannot mean one thing in the rail and another in a chip. It is unit tested in params.test.ts.
 *
 * Five dimensions take several values at once (make, model, body, fuel, transmission, province),
 * because a buyer choosing between a Hilux and a Ranger should not have to run two searches. They
 * travel as repeated parameters, `make=toyota&make=ford`, which is what a GET form with two ticked
 * checkboxes produces on its own with no JavaScript. A single value, the only shape older links and
 * the search box produce, reads exactly as it always did.
 */

export type RawParams = Record<string, string | string[] | undefined>;

export const MULTI_KEYS = ["make", "model", "body", "fuel", "transmission", "province"] as const;
export type MultiKey = (typeof MULTI_KEYS)[number];

export const SINGLE_SLUG_KEYS = ["city", "colour", "variant"] as const;
export type SingleSlugKey = (typeof SINGLE_SLUG_KEYS)[number];

export const NUMBER_KEYS = ["minPrice", "maxPrice", "minYear", "maxYear", "maxMileage"] as const;
export type NumberKey = (typeof NUMBER_KEYS)[number];

export type Condition = "new" | "demo" | "pre_owned";
export const CONDITIONS: Record<Condition, string> = {
  new: "New",
  demo: "Ex-demo",
  pre_owned: "Used",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest listed" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
  { value: "mileage", label: "Lowest mileage" },
  { value: "year", label: "Newest model year" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/** Price bands for the From and To selects. A value outside them is added to its list. */
export const PRICE_STEPS = [
  50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 500_000, 600_000, 750_000,
  1_000_000, 1_500_000, 2_000_000,
];

/** Mileage ceilings, each offered with the number of cars under it. */
export const MILEAGE_STEPS = [10_000, 30_000, 50_000, 75_000, 100_000, 150_000, 200_000];

export type SearchState = {
  q?: string;
  make: string[];
  model: string[];
  body: string[];
  fuel: string[];
  transmission: string[];
  province: string[];
  city?: string;
  colour?: string;
  variant?: string;
  condition?: Condition;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  sort: SortKey;
};

/** Every key this module understands. Anything else a URL carries is passed through untouched. */
export const KNOWN_KEYS = new Set<string>([
  "q",
  ...MULTI_KEYS,
  ...SINGLE_SLUG_KEYS,
  "condition",
  ...NUMBER_KEYS,
  "sort",
  "page",
]);

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;
const MAX_VALUES = 20;

const all = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .map((v) => v.trim())
    .filter(Boolean);

const first = (value: string | string[] | undefined): string | undefined => all(value)[0];

function slugs(value: string | string[] | undefined): string[] {
  const out: string[] = [];
  for (const v of all(value)) {
    const slug = v.toLowerCase();
    if (SLUG.test(slug) && !out.includes(slug)) out.push(slug);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}

function slug(value: string | string[] | undefined): string | undefined {
  return slugs(value)[0];
}

/** A whole positive number within a sane ceiling, or nothing. "abc", "-5" and "1e99" are nothing. */
function count(value: string | string[] | undefined, ceiling: number): number | undefined {
  const text = first(value);
  if (!text || !/^\d{1,10}$/.test(text)) return undefined;
  const n = Number(text);
  return n > 0 && n <= ceiling ? n : undefined;
}

export function isSortKey(value: string | undefined): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/** Reads a request's parameters into a search. Invalid values are dropped, never thrown on. */
export function readState(params: RawParams): SearchState {
  const q = first(params.q)?.slice(0, 120);
  const condition = first(params.condition);
  const sort = first(params.sort);

  let minPrice = count(params.minPrice, 100_000_000);
  let maxPrice = count(params.maxPrice, 100_000_000);
  if (minPrice && maxPrice && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];

  let minYear = count(params.minYear, 2100);
  let maxYear = count(params.maxYear, 2100);
  if (minYear && minYear < 1900) minYear = undefined;
  if (maxYear && maxYear < 1900) maxYear = undefined;
  if (minYear && maxYear && minYear > maxYear) [minYear, maxYear] = [maxYear, minYear];

  return {
    q: q || undefined,
    make: slugs(params.make),
    model: slugs(params.model),
    body: slugs(params.body),
    fuel: slugs(params.fuel),
    transmission: slugs(params.transmission),
    province: slugs(params.province),
    city: slug(params.city),
    colour: slug(params.colour),
    variant: slug(params.variant),
    condition: condition && condition in CONDITIONS ? (condition as Condition) : undefined,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    maxMileage: count(params.maxMileage, 10_000_000),
    sort: isSortKey(sort) ? sort : "newest",
  };
}

/** URLSearchParams, or a plain object from Next, into the same RawParams shape. */
export function paramsFromSearch(search: URLSearchParams): RawParams {
  const out: RawParams = {};
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}

/** The pairs a search writes to a URL, in a stable order. Empty values are left out. */
export function statePairs(state: SearchState): [string, string][] {
  const pairs: [string, string][] = [];
  if (state.q) pairs.push(["q", state.q]);
  for (const key of MULTI_KEYS) for (const value of state[key]) pairs.push([key, value]);
  for (const key of SINGLE_SLUG_KEYS) {
    const value = state[key];
    if (value) pairs.push([key, value]);
  }
  if (state.condition) pairs.push(["condition", state.condition]);
  for (const key of NUMBER_KEYS) {
    const value = state[key];
    if (value) pairs.push([key, String(value)]);
  }
  if (state.sort !== "newest") pairs.push(["sort", state.sort]);
  return pairs;
}

/**
 * Every parameter the buyer arrived with, minus the ones named, as [key, value] pairs.
 *
 * This is what a GET form carries as hidden inputs. A form submits only its own controls, so
 * anything it does not render and does not carry is silently dropped the moment it is used. That
 * is how the sort control once threw away every ticked filter.
 */
export function carriedPairs(params: RawParams, without: Iterable<string>): [string, string][] {
  const skip = new Set(without);
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (skip.has(key)) continue;
    for (const v of all(value)) pairs.push([key, v]);
  }
  return pairs;
}

export function hrefFor(path: string, pairs: [string, string][]): string {
  const query = new URLSearchParams(pairs).toString();
  return query ? `${path}?${query}` : path;
}

/** A query string with the empty fields a GET form always sends taken out. */
export function cleanQuery(pairs: Iterable<[string, string]>): string {
  const kept: [string, string][] = [];
  for (const [key, value] of pairs) {
    if (key === "page") continue;
    const v = value.trim();
    if (v) kept.push([key, v]);
  }
  return new URLSearchParams(kept).toString();
}

/**
 * How many filters are applied, for the "Filters (3)" button. A price range counts once, as does a
 * year range; sort and page are not filters.
 */
export function activeFilterCount(state: SearchState): number {
  let n = 0;
  if (state.q) n += 1;
  for (const key of MULTI_KEYS) n += state[key].length;
  for (const key of SINGLE_SLUG_KEYS) if (state[key]) n += 1;
  if (state.condition) n += 1;
  if (state.minPrice || state.maxPrice) n += 1;
  if (state.minYear || state.maxYear) n += 1;
  if (state.maxMileage) n += 1;
  return n;
}

/** "R 150 000 to R 300 000", "Up to R 300 000", "From R 150 000". */
export function rangeLabel(
  min: number | undefined,
  max: number | undefined,
  format: (n: number) => string,
): string | null {
  if (min && max) return `${format(min)} to ${format(max)}`;
  if (max) return `Up to ${format(max)}`;
  if (min) return `From ${format(min)}`;
  return null;
}

/** "2019 to 2023", "2019 or newer", "2023 or older". */
export function yearLabel(min: number | undefined, max: number | undefined): string | null {
  if (min && max) return min === max ? String(min) : `${min} to ${max}`;
  if (min) return `${min} or newer`;
  if (max) return `${max} or older`;
  return null;
}

/** A price value list with the current value included, so a typed "under 275k" still shows. */
export function withValue(steps: number[], value: number | undefined): number[] {
  if (!value || steps.includes(value)) return steps;
  return [...steps, value].sort((a, b) => a - b);
}
