import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { resolveQuery, toCard } from "@/lib/search";
import type { Vehicle } from "@/payload-types";

import {
  type FacetCounts,
  facetCounts,
  matches,
  NO_FILTERS,
  type ResolvedFilters,
  type StockRow,
  sortRows,
} from "./match";
import type { SearchState } from "./params";

/**
 * The data behind a search, loaded once and cached.
 *
 * Two reads, both small and both cached:
 *
 *   rows      one compact row per live car: ids of its make, model, body and so on, price,
 *             year, mileage, where it is and whether it is demonstration stock. Sixty seconds,
 *             and dropped by the `vehicles` tag the moment any car is written.
 *   taxonomy  the names and slugs the filters and the chips print. An hour, dropped by `taxonomy`.
 *
 * The VIN is never selected, so it cannot reach a cache entry. Cards for the page on screen are
 * then read at depth 2 for those twenty-four ids only, through the shared `toCard` mapper, and
 * cached by id list.
 *
 * This replaced more than a hundred count queries per render of the old filter rail and a
 * separate where clause per page, which disagreed with each other. See match.ts.
 */

export type Term = { id: number; name: string; slug: string };
export type MakeTerm = Term & { active: boolean };
export type ModelTerm = Term & { make: number | null };

export type ParentedTerm = Term & { parent: number | null };

export type Taxonomy = {
  makes: MakeTerm[];
  models: ModelTerm[];
  bodies: Term[];
  fuels: Term[];
  transmissions: Term[];
  provinces: Term[];
  /** Each with its province. */
  cities: ParentedTerm[];
  colours: Term[];
  /** Each with its model. */
  variants: ParentedTerm[];
};

export const PER_PAGE = 24;

const idOf = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    return typeof id === "number" ? id : null;
  }
  return null;
};

async function readRows(): Promise<StockRow[]> {
  const payload = await getPayload({ config });

  const [vehicles, branches] = await Promise.all([
    payload.find({
      collection: "vehicles",
      where: { status: { equals: "live" } },
      depth: 0,
      pagination: false,
      select: {
        make: true,
        model: true,
        variant: true,
        bodyType: true,
        fuelType: true,
        transmission: true,
        exteriorColour: true,
        dealer: true,
        branch: true,
        condition: true,
        price: true,
        modelYear: true,
        mileageKm: true,
        publishedAt: true,
        isDemonstration: true,
      },
    }),
    payload.find({
      collection: "branches",
      depth: 0,
      pagination: false,
      select: { city: true, province: true },
    }),
  ]);

  const where = new Map<number, { city: number | null; province: number | null }>();
  for (const branch of branches.docs) {
    where.set(branch.id, { city: idOf(branch.city), province: idOf(branch.province) });
  }

  return (vehicles.docs as Partial<Vehicle>[]).map((doc) => {
    const place = where.get(idOf(doc.branch) ?? -1);
    return {
      id: doc.id as number,
      make: idOf(doc.make),
      model: idOf(doc.model),
      variant: idOf(doc.variant),
      body: idOf(doc.bodyType),
      fuel: idOf(doc.fuelType),
      transmission: idOf(doc.transmission),
      colour: idOf(doc.exteriorColour),
      dealer: idOf(doc.dealer),
      city: place?.city ?? null,
      province: place?.province ?? null,
      condition: doc.condition ?? null,
      price: Number(doc.price) || 0,
      year: Number(doc.modelYear) || 0,
      mileage: Number(doc.mileageKm) || 0,
      publishedAt: doc.publishedAt ?? null,
      demo: Boolean(doc.isDemonstration),
    };
  });
}

export const getRows = unstable_cache(readRows, ["search-stock-rows"], {
  revalidate: 60,
  tags: ["vehicles"],
});

async function readTaxonomy(): Promise<Taxonomy> {
  const payload = await getPayload({ config });
  const terms = async (collection: string, sort: string) => {
    const found = await payload.find({
      collection: collection as never,
      sort,
      depth: 0,
      pagination: false,
    });
    return found.docs as unknown as (Term & {
      make?: unknown;
      model?: unknown;
      province?: unknown;
      isActive?: boolean | null;
    })[];
  };

  const [makes, models, bodies, fuels, transmissions, provinces, cities, colours, variants] =
    await Promise.all([
      terms("makes", "name"),
      terms("models", "name"),
      terms("body-types", "sortOrder"),
      terms("fuel-types", "sortOrder"),
      terms("transmissions", "sortOrder"),
      terms("provinces", "name"),
      terms("cities", "name"),
      terms("colours", "name"),
      terms("variants", "name"),
    ]);

  const plain = (list: Term[]) => list.map(({ id, name, slug }) => ({ id, name, slug }));

  return {
    // An inactive make keeps its own landing page and its listings, and leaves the filter list,
    // which is what the makes collection promises.
    makes: makes.map(({ id, name, slug, isActive }) => ({
      id,
      name,
      slug,
      active: isActive !== false,
    })),
    models: models.map(({ id, name, slug, make }) => ({ id, name, slug, make: idOf(make) })),
    bodies: plain(bodies),
    fuels: plain(fuels),
    transmissions: plain(transmissions),
    provinces: plain(provinces),
    cities: cities.map(({ id, name, slug, province }) => ({
      id,
      name,
      slug,
      parent: idOf(province),
    })),
    colours: plain(colours),
    variants: variants.map(({ id, name, slug, model }) => ({
      id,
      name,
      slug,
      parent: idOf(model),
    })),
  };
}

/*
 * Every slug a URL can carry resolves against this one cached list, never through a cache entry
 * of its own. A per-slug cache would store a miss for every made-up `?city=` a crawler or a script
 * invents, which is unbounded growth on a shared host. The lists are small today (under a hundred
 * variants); if variants reach the tens of thousands, they move to a lookup by id list.
 */
export const getTaxonomy = unstable_cache(readTaxonomy, ["search-taxonomy"], {
  revalidate: 3600,
  tags: ["taxonomy"],
});

export type Resolved = {
  filters: ResolvedFilters;
  /**
   * The search as it is actually applied: what the search box understood folded in, and only
   * slugs that exist. The filter form, the chips and the "Filters (3)" count all draw this.
   */
  effective: SearchState;
  terms: {
    make: MakeTerm[];
    model: ModelTerm[];
    body: Term[];
    fuel: Term[];
    transmission: Term[];
    province: Term[];
    city: ParentedTerm | null;
    colour: Term | null;
    variant: ParentedTerm | null;
  };
  /** Slugs the URL asked for that do not exist. A landing page 404s on any of them. */
  missing: string[];
  /** Set when a city had no stock and the search widened to its province. */
  widened: { from: string; to: string } | null;
  /** What the search box did with the words, when there were any. */
  query: { text: string; matched: string[]; unmatched: string[] } | null;
};

const pick = <T extends Term>(list: T[], slugs: string[]) =>
  slugs.map((slug) => list.find((term) => term.slug === slug)).filter((t): t is T => Boolean(t));

/**
 * Turns a search into ids.
 *
 * What someone typed into the search box resolves into the same filters the filter form
 * produces, and an explicit parameter always wins over it, so a buyer who searched "bakkie under
 * 300" and then ticked Diesel keeps both. A query that understood nothing matches nothing, rather
 * than showing all the stock under a heading that implies it was searched.
 *
 * A city with no stock widens to its province, and says so. No dealership has a branch registered
 * in Cape Town, Durban or Johannesburg (they are in Bellville, Pinetown and Sandton), and answering
 * "nothing" to the three biggest cities in the country while holding dozens of cars in each
 * province is technically right and practically broken. Landing pages turn this off: a page called
 * "Cars for sale in Pretoria" must only ever hold cars in Pretoria.
 */
export async function resolveSearch(
  state: SearchState,
  rows: StockRow[],
  taxonomy: Taxonomy,
  { widen = true }: { widen?: boolean } = {},
): Promise<Resolved> {
  const parsed = await resolveQuery(state.q);
  const understood =
    !state.q ||
    Boolean(
      parsed.make ||
        parsed.model ||
        parsed.body ||
        parsed.fuel ||
        parsed.transmission ||
        parsed.province ||
        parsed.city ||
        parsed.minPrice ||
        parsed.maxPrice,
    );

  const or = (explicit: string[], fromQuery: string | undefined) =>
    explicit.length > 0 ? explicit : fromQuery ? [fromQuery] : [];

  const asked = {
    make: or(state.make, parsed.make),
    model: or(state.model, parsed.model),
    body: or(state.body, parsed.body),
    fuel: or(state.fuel, parsed.fuel),
    transmission: or(state.transmission, parsed.transmission),
    province: or(state.province, parsed.province),
  };

  const make = pick(taxonomy.makes, asked.make);
  const model = pick(taxonomy.models, asked.model);
  const body = pick(taxonomy.bodies, asked.body);
  const fuel = pick(taxonomy.fuels, asked.fuel);
  const transmission = pick(taxonomy.transmissions, asked.transmission);
  const province = pick(taxonomy.provinces, asked.province);

  const citySlug = state.city ?? parsed.city;
  const cityTerm = taxonomy.cities.find((term) => term.slug === citySlug) ?? null;
  const colourTerm = taxonomy.colours.find((term) => term.slug === state.colour) ?? null;
  const variantTerm = taxonomy.variants.find((term) => term.slug === state.variant) ?? null;

  const missing: string[] = [];
  const found = (key: string, slugs: string[], terms: Term[]) => {
    for (const slug of slugs)
      if (!terms.some((t) => t.slug === slug)) missing.push(`${key}:${slug}`);
  };
  found("make", asked.make, make);
  found("model", asked.model, model);
  found("body", asked.body, body);
  found("fuel", asked.fuel, fuel);
  found("transmission", asked.transmission, transmission);
  found("province", asked.province, province);
  if (citySlug && !cityTerm) missing.push(`city:${citySlug}`);
  if (state.colour && !colourTerm) missing.push(`colour:${state.colour}`);
  if (state.variant && !variantTerm) missing.push(`variant:${state.variant}`);

  let cities: number[] = [];
  let widened: Resolved["widened"] = null;
  if (cityTerm) {
    const stocked = rows.some((row) => row.city === cityTerm.id);
    const provinceTerm = taxonomy.provinces.find((p) => p.id === cityTerm.parent);
    const provinceStocked = provinceTerm && rows.some((row) => row.province === provinceTerm.id);
    if (widen && !stocked && provinceTerm && provinceStocked) {
      cities = [...new Set(rows.filter((r) => r.province === provinceTerm.id).map((r) => r.city))]
        .filter((id): id is number => id !== null)
        .concat(cityTerm.id);
      widened = { from: cityTerm.name, to: provinceTerm.name };
    } else {
      cities = [cityTerm.id];
    }
  }

  const minPrice = state.minPrice ?? parsed.minPrice;
  const maxPrice = state.maxPrice ?? parsed.maxPrice;

  const filters: ResolvedFilters = {
    ...NO_FILTERS,
    nothing: !understood,
    // A make with a model chosen under it narrows to those models; a make without one keeps
    // every car of that make. Choosing a Hilux and a Ranger at once therefore works.
    openMakes: make.filter((m) => !model.some((x) => x.make === m.id)).map((m) => m.id),
    models: model.map((m) => m.id),
    bodies: body.map((t) => t.id),
    fuels: fuel.map((t) => t.id),
    transmissions: transmission.map((t) => t.id),
    provinces: province.map((t) => t.id),
    cities,
    colour: colourTerm?.id ?? null,
    variant: variantTerm?.id ?? null,
    condition: state.condition ?? null,
    minPrice: minPrice ?? null,
    maxPrice: maxPrice ?? null,
    minYear: state.minYear ?? null,
    maxYear: state.maxYear ?? null,
    maxMileage: state.maxMileage ?? null,
  };

  return {
    filters,
    effective: {
      ...state,
      make: make.map((t) => t.slug),
      model: model.map((t) => t.slug),
      body: body.map((t) => t.slug),
      fuel: fuel.map((t) => t.slug),
      transmission: transmission.map((t) => t.slug),
      province: province.map((t) => t.slug),
      city: cityTerm?.slug,
      colour: colourTerm?.slug,
      variant: variantTerm?.slug,
      minPrice,
      maxPrice,
    },
    terms: {
      make,
      model,
      body,
      fuel,
      transmission,
      province,
      city: cityTerm,
      colour: colourTerm,
      variant: variantTerm,
    },
    missing,
    widened,
    query: state.q ? { text: state.q, matched: parsed.matched, unmatched: parsed.unmatched } : null,
  };
}

async function readCards(ids: number[]): Promise<VehicleCardData[]> {
  if (ids.length === 0) return [];
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "vehicles",
    where: { and: [{ id: { in: ids } }, { status: { equals: "live" } }] },
    depth: 2,
    pagination: false,
  });
  const byId = new Map(found.docs.map((doc) => [doc.id, doc]));
  // `toCard` keeps only what a card draws. The VIN and everything else is discarded here.
  return ids
    .map((id) => byId.get(id))
    .filter((doc): doc is Vehicle => Boolean(doc))
    .map(toCard);
}

/** The cards for one page of results, in the order given, cached by id list. */
export function getCards(ids: number[]): Promise<VehicleCardData[]> {
  return unstable_cache(() => readCards(ids), ["search-cards", ids.join(",")], {
    revalidate: 60,
    tags: ["vehicles"],
  })();
}

export type SearchSet = {
  resolved: Resolved;
  rows: StockRow[];
  taxonomy: Taxonomy;
  /** Every matching row, sorted. */
  matching: StockRow[];
  facets: FacetCounts;
};

/** Resolves, filters, counts and sorts, without reading any cards. Metadata uses this. */
export async function searchSet(
  state: SearchState,
  options: { widen?: boolean } = {},
): Promise<SearchSet> {
  const [rows, taxonomy] = await Promise.all([getRows(), getTaxonomy()]);
  const resolved = await resolveSearch(state, rows, taxonomy, options);
  const matching = sortRows(
    rows.filter((row) => matches(row, resolved.filters)),
    state.sort,
  );
  return { resolved, rows, taxonomy, matching, facets: facetCounts(rows, resolved.filters) };
}

export type SearchRun = SearchSet & {
  total: number;
  demo: number;
  page: number;
  totalPages: number;
  cards: VehicleCardData[];
};

/** How many cars a search matches, for the live count on the filter button. */
export async function countSearch(state: SearchState): Promise<number> {
  const [rows, taxonomy] = await Promise.all([getRows(), getTaxonomy()]);
  const { filters } = await resolveSearch(state, rows, taxonomy);
  let n = 0;
  for (const row of rows) if (matches(row, filters)) n += 1;
  return n;
}

/** Resolves, filters, counts, sorts and reads one page of cards. */
export async function runSearch(
  state: SearchState,
  requestedPage: number,
  options: { widen?: boolean } = {},
): Promise<SearchRun> {
  const set = await searchSet(state, options);
  const total = set.matching.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  // A page number past the end (an old link after stock sold) shows the last page, not nothing.
  const page = Math.max(1, Math.min(requestedPage, totalPages));
  const ids = set.matching.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((row) => row.id);

  return {
    ...set,
    total,
    demo: set.matching.filter((row) => row.demo).length,
    page,
    totalPages,
    cards: await getCards(ids),
  };
}
