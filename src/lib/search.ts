import config from "@payload-config";
import type { Where } from "payload";
import { getPayload } from "payload";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { populated, relName, relSlug } from "@/lib/relations";
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

/** Resolves a taxonomy slug to its id. Returns null for an unknown slug, which 404s. */
export async function resolveSlug(collection: string, slug?: string): Promise<number | null> {
  if (!slug) return null;
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

export function toCard(doc: Vehicle): VehicleCardData {
  const branch = populated(doc.branch);
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
  };
}

export const PER_PAGE = 24;

export async function searchVehicles(filters: SearchFilters) {
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
    const where: Where = cityId
      ? { city: { equals: cityId } }
      : { province: { equals: provinceId } };
    const branches = await payload.find({ collection: "branches", where, limit: 500, depth: 0 });
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

  const results = await payload.find({
    collection: "vehicles",
    where: where as never,
    sort: SORTS[filters.sort ?? "newest"] ?? SORTS.newest,
    limit: PER_PAGE,
    page: Math.max(1, filters.page ?? 1),
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

/** Price range across a filtered set, for the copy on a landing page. */
export async function priceRange(
  filters: SearchFilters,
): Promise<{ min: number; max: number } | null> {
  const payload = await getPayload({ config });
  const [makeId, modelId, bodyId] = await Promise.all([
    resolveSlug("makes", filters.make),
    resolveSlug("models", filters.model),
    resolveSlug("body-types", filters.body),
  ]);

  const where: Record<string, unknown> = { status: { equals: "live" } };
  if (makeId) where.make = { equals: makeId };
  if (modelId) where.model = { equals: modelId };
  if (bodyId) where.bodyType = { equals: bodyId };

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
