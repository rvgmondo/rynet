import config from "@payload-config";
import { unstable_cache } from "next/cache";
import type { Where } from "payload";
import { getPayload } from "payload";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { type ParsedQuery, parseQuery, type Term } from "@/lib/query-parse";
import { populated, relName, relSlug } from "@/lib/relations";
import { vehiclePhoto } from "@/lib/vehicle-photo";
import type { Vehicle } from "@/payload-types";

/**
 * The one search query.
 *
 * `/cars` and every facet landing page underneath it run through this. That matters more
 * than it saves: a facet page that builds its own query drifts from the search page, and
 * the two then disagree about how many Toyotas there are, which is the sort of thing a
 * dealership notices before we do.
 *
 * Nothing here is the denormalised index table described in docs/ARCHITECTURE.md. At 311
 * vehicles Payload's own query is instant, and building the index before the facet set has
 * settled would be optimising a shape that is still moving. The trigger to build it is
 * written down: p95 above 300ms at 50 concurrent, or 250 000 live listings.
 */

export type SearchFilters = {
  make?: string;
  model?: string;
  variant?: string;
  body?: string;
  fuel?: string;
  transmission?: string;
  province?: string;
  city?: string;
  condition?: "new" | "demo" | "pre_owned";
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
};

export const SORTS: Record<string, string> = {
  newest: "-publishedAt",
  "price-asc": "price",
  "price-desc": "-price",
  mileage: "mileageKm",
  year: "-modelYear",
};

/**
 * How long a cached taxonomy answer is allowed to be stale.
 *
 * An hour, because makes, models, body types, provinces and colours change when someone
 * edits the seed data, which is roughly never, and every one of them is invalidated by hand
 * through the `taxonomy` tag when it does happen. Stock is a different matter and is not
 * cached here at all.
 */
const TAXONOMY_TTL = 3600;

async function readSlug(collection: string, slug: string): Promise<number | null> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: collection as never,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const doc = found.docs[0] as { id: number } | undefined;
  return doc?.id ?? null;
}

/**
 * Resolves a taxonomy slug to its id. Returns null for an unknown slug, which 404s.
 *
 * Cached per slug. `/cars` resolves eight of these on every request, one per facet
 * dimension, and each was a separate round trip to answer a question whose answer changes
 * about once a year. The key is bounded by the number of slugs that exist, so a crawler
 * cannot grow this without limit: an unknown slug resolves to null and 404s.
 */
export function resolveSlug(collection: string, slug?: string): Promise<number | null> {
  if (!slug) return Promise.resolve(null);

  return unstable_cache(() => readSlug(collection, slug), ["slug", collection, slug], {
    revalidate: TAXONOMY_TTL,
    tags: ["taxonomy"],
  })();
}

/**
 * Turns what someone typed into real filters.
 *
 * The parsing itself is a pure function in query-parse.ts and is tested there. This is only
 * the part that needs the database: it loads the taxonomy names and their seeded aliases,
 * which is what lets "bakkie", "vw" and "pta" resolve without a synonym list maintained by
 * hand somewhere else.
 *
 * The corpus is cached rather than re-read. It is seven queries, and two of them pull two
 * thousand models and five hundred cities in full, on every single request that carries a
 * search term. Nothing was caching that: Payload has no such cache, and the comment that
 * used to sit here claiming it did was simply wrong.
 */
type Corpus = {
  makes: Term[];
  models: Term[];
  bodyTypes: Term[];
  fuelTypes: Term[];
  transmissions: Term[];
  provinces: Term[];
  cities: Term[];
};

async function readCorpus(): Promise<Corpus> {
  const payload = await getPayload({ config });
  const load = async (collection: string, limit: number): Promise<Term[]> => {
    const found = await payload.find({
      collection: collection as never,
      limit,
      depth: 0,
      pagination: false,
    });
    return found.docs as unknown as Term[];
  };

  const [makes, models, bodyTypes, fuelTypes, transmissions, provinces, cities] = await Promise.all(
    [
      load("makes", 200),
      load("models", 2000),
      load("body-types", 50),
      load("fuel-types", 50),
      load("transmissions", 50),
      load("provinces", 20),
      load("cities", 500),
    ],
  );

  return { makes, models, bodyTypes, fuelTypes, transmissions, provinces, cities };
}

const getCorpus = unstable_cache(readCorpus, ["search-corpus"], {
  revalidate: TAXONOMY_TTL,
  tags: ["taxonomy"],
});

export async function resolveQuery(q: string | undefined | null): Promise<ParsedQuery> {
  if (!q?.trim()) return { matched: [], unmatched: [] };

  return parseQuery(q, await getCorpus());
}

export function toCard(doc: Vehicle): VehicleCardData {
  const branch = populated(doc.branch);
  // The paint colour fills the card's image area while there is no photography, so it travels
  // with every card rather than being fetched again per listing.
  const colour = doc.exteriorColour;
  return {
    publicRef: doc.publicRef ?? "",
    modelYear: doc.modelYear,
    makeName: relName(doc.make) ?? "",
    makeSlug: relSlug(doc.make),
    modelName: relName(doc.model) ?? "",
    modelSlug: relSlug(doc.model),
    variantName: relName(doc.variant),
    price: doc.price,
    previousPrice: doc.previousPrice ?? null,
    mileageKm: doc.mileageKm,
    transmissionName: relName(doc.transmission),
    fuelName: relName(doc.fuelType),
    bodyName: relName(doc.bodyType),
    condition: doc.condition,
    dealerName: populated(doc.dealer)?.tradingName ?? "",
    dealerSlug: populated(doc.dealer)?.slug ?? "",
    cityName: branch ? relName(branch.city) : null,
    provinceName: branch ? relName(branch.province) : null,
    isDemonstration: Boolean(doc.isDemonstration),
    photo: vehiclePhoto(doc, "card"),
    colourName: relName(colour),
    colourSwatch: colour && typeof colour === "object" ? (colour.swatch ?? null) : null,
    // The family decides which half of the plate maths runs. White, silver, grey and black
    // have no usable hue, and they are roughly 40% of South African stock.
    colourFamily: colour && typeof colour === "object" ? (colour.family ?? null) : null,
  };
}

export const PER_PAGE = 24;

/**
 * The highest page number anyone is allowed to ask for.
 *
 * `Math.max(1, n)` clamped the floor and nothing clamped the ceiling, so
 * `/cars?page=999999999999999999999` reached SQLite as an offset and threw, and the marketplace
 * answered 500. A crawler following a malformed link, or anybody editing the address bar, could
 * take the search page down. Ten thousand pages is 240 000 listings, which is far past anything
 * this platform holds before the index table in ARCHITECTURE.md exists.
 */
const MAX_PAGE = 10_000;

export function safePage(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}

/**
 * One clause builder, for every query that answers a question about the same set.
 *
 * There were two. `searchVehicles` resolved eight dimensions and `priceRange` resolved three, so
 * the price range printed on a landing page was the range of a DIFFERENT set from the cars
 * underneath it. Every province, city, fuel and condition page therefore quoted the whole
 * catalogue: /cars/in/limpopo, which holds no cars at all, told a buyer it had stock "from
 * R 83 300 to R 1 489 600". That is not a design slip. It is forty-odd indexable pages stating
 * something untrue about price, which is the one number this market checks.
 *
 * So the clause set lives here once and both callers take it. A dimension added to search now
 * reaches the range by construction rather than by somebody remembering.
 */
export async function buildVehicleWhere(filters: SearchFilters): Promise<Record<string, unknown>> {
  const payload = await getPayload({ config });

  const [makeId, modelId, variantId, bodyId, fuelId, transmissionId, provinceId, cityId] =
    await Promise.all([
      resolveSlug("makes", filters.make),
      resolveSlug("models", filters.model),
      resolveSlug("variants", filters.variant),
      resolveSlug("body-types", filters.body),
      resolveSlug("fuel-types", filters.fuel),
      resolveSlug("transmissions", filters.transmission),
      resolveSlug("provinces", filters.province),
      resolveSlug("cities", filters.city),
    ]);

  // Location filters through the branch, so they need the matching branch ids first.
  let branchIds: number[] | undefined;
  if (provinceId || cityId) {
    const branchWhere: Where = cityId
      ? { city: { equals: cityId } }
      : { province: { equals: provinceId } };
    const branches = await payload.find({
      collection: "branches",
      where: branchWhere,
      limit: 500,
      depth: 0,
    });
    branchIds = branches.docs.map((b) => b.id);
    // A location with no branches means no stock, and an empty `in` clause would otherwise
    // match everything rather than nothing.
    if (branchIds.length === 0) branchIds = [-1];
  }

  const where: Record<string, unknown> = { status: { equals: "live" } };
  if (makeId) where.make = { equals: makeId };
  if (modelId) where.model = { equals: modelId };
  if (variantId) where.variant = { equals: variantId };
  if (bodyId) where.bodyType = { equals: bodyId };
  if (fuelId) where.fuelType = { equals: fuelId };
  if (transmissionId) where.transmission = { equals: transmissionId };
  if (branchIds) where.branch = { in: branchIds };
  if (filters.condition) where.condition = { equals: filters.condition };
  if (filters.minPrice || filters.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { greater_than_equal: filters.minPrice } : {}),
      ...(filters.maxPrice ? { less_than_equal: filters.maxPrice } : {}),
    };
  }

  return where;
}

export async function searchVehicles(filters: SearchFilters) {
  const payload = await getPayload({ config });

  // Resolved a second time only to report which slugs were unknown, so a caller can 404 rather
  // than silently ignoring a filter. The clauses themselves come from buildVehicleWhere.
  const [makeId, modelId, bodyId, fuelId, provinceId, cityId] = await Promise.all([
    resolveSlug("makes", filters.make),
    resolveSlug("models", filters.model),
    resolveSlug("body-types", filters.body),
    resolveSlug("fuel-types", filters.fuel),
    resolveSlug("provinces", filters.province),
    resolveSlug("cities", filters.city),
  ]);

  const where = await buildVehicleWhere(filters);

  const results = await payload.find({
    collection: "vehicles",
    where: where as never,
    sort: SORTS[filters.sort ?? "newest"] ?? SORTS.newest,
    limit: PER_PAGE,
    page: safePage(filters.page ?? 1),
    depth: 2,
  });

  return {
    vehicles: results.docs.map(toCard),
    total: results.totalDocs,
    page: results.page ?? 1,
    totalPages: results.totalPages,
    /** Unresolved slugs, so a caller can 404 rather than silently ignoring a filter. */
    unresolved: {
      make: Boolean(filters.make && !makeId),
      model: Boolean(filters.model && !modelId),
      body: Boolean(filters.body && !bodyId),
      fuel: Boolean(filters.fuel && !fuelId),
      province: Boolean(filters.province && !provinceId),
      city: Boolean(filters.city && !cityId),
    },
  };
}

/**
 * Price range across a filtered set, for the copy on a landing page.
 *
 * Takes the same clause set as the search underneath it. See buildVehicleWhere for what happened
 * for as long as it did not.
 */
export async function priceRange(
  filters: SearchFilters,
): Promise<{ min: number; max: number } | null> {
  const payload = await getPayload({ config });
  const where = await buildVehicleWhere(filters);

  const [cheapest, dearest] = await Promise.all([
    payload.find({
      collection: "vehicles",
      where: where as never,
      sort: "price",
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: "vehicles",
      where: where as never,
      sort: "-price",
      limit: 1,
      depth: 0,
    }),
  ]);

  const min = cheapest.docs[0]?.price;
  const max = dearest.docs[0]?.price;
  if (typeof min !== "number" || typeof max !== "number") return null;
  return { min, max };
}
