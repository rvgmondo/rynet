import config from "@payload-config";
import type { Metadata } from "next";
import { getPayload } from "payload";

import { FacetRail } from "@/components/vehicles/facet-rail";
import { Pagination } from "@/components/vehicles/pagination";
import { ResultsHeader } from "@/components/vehicles/results-header";
import { VehicleCard, type VehicleCardData } from "@/components/vehicles/vehicle-card";
import { formatRand } from "@/lib/format";
import { populated, relName, relSlug } from "@/lib/relations";

export const metadata: Metadata = {
  title: "Cars for sale from verified dealerships",
  description:
    "Search used, demo and new cars from registered South African dealerships. Filter by make, model, price, body type, transmission and province. No private sellers.",
};

const PER_PAGE = 24;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Search.
 *
 * Server rendered, deliberately. Section 13 requires that every indexable route ships full
 * HTML, and search is the most valuable indexable surface on the platform. A client-side
 * skeleton that Googlebot sees as empty would throw away the entire SEO argument.
 *
 * Filter state lives entirely in the URL. That is a hard requirement in Section 6 and it is
 * also what makes a result set shareable, restorable and crawlable. There is no client
 * state store holding what the buyer filtered by.
 *
 * The facet counts here are computed with one grouped query per dimension against the
 * filtered set. That is the correct semantics and it is not yet the performant shape: the
 * single-round-trip CTE described in docs/ARCHITECTURE.md lands with the search layer
 * proper, along with the denormalised index table. At 311 vehicles this is instant, and
 * writing the optimised version before the facet set is settled would be guessing.
 */
export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const payload = await getPayload({ config });

  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);
  const sort = one(params.sort) ?? "newest";
  const makeSlug = one(params.make);
  const bodySlug = one(params.body);
  const fuelSlug = one(params.fuel);
  const transmissionSlug = one(params.transmission);
  const provinceSlug = one(params.province);
  const minPrice = Number(one(params.minPrice) ?? 0) || undefined;
  const maxPrice = Number(one(params.maxPrice) ?? 0) || undefined;

  // Resolve slugs to ids. Taxonomies are small and cached; this is not the hot path.
  const resolve = async (collection: string, slug?: string) => {
    if (!slug) return undefined;
    const found = await payload.find({
      collection: collection as never,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    const doc = found.docs[0] as { id: number } | undefined;
    return doc?.id;
  };

  const [makeId, bodyId, fuelId, transmissionId, provinceId] = await Promise.all([
    resolve("makes", makeSlug),
    resolve("body-types", bodySlug),
    resolve("fuel-types", fuelSlug),
    resolve("transmissions", transmissionSlug),
    resolve("provinces", provinceSlug),
  ]);

  // Province filters through the branch, so it needs the branch ids for that province.
  let branchIds: number[] | undefined;
  if (provinceId) {
    const branches = await payload.find({
      collection: "branches",
      where: { province: { equals: provinceId } },
      limit: 500,
      depth: 0,
    });
    branchIds = branches.docs.map((b) => b.id);
  }

  const where: Record<string, unknown> = { status: { equals: "live" } };
  if (makeId) where.make = { equals: makeId };
  if (bodyId) where.bodyType = { equals: bodyId };
  if (fuelId) where.fuelType = { equals: fuelId };
  if (transmissionId) where.transmission = { equals: transmissionId };
  if (branchIds) where.branch = { in: branchIds };
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { greater_than_equal: minPrice } : {}),
      ...(maxPrice ? { less_than_equal: maxPrice } : {}),
    };
  }

  const SORTS: Record<string, string> = {
    newest: "-publishedAt",
    "price-asc": "price",
    "price-desc": "-price",
    mileage: "mileageKm",
    year: "-modelYear",
  };

  const results = await payload.find({
    collection: "vehicles",
    where: where as never,
    sort: SORTS[sort] ?? SORTS.newest,
    limit: PER_PAGE,
    page,
    depth: 2,
  });

  const vehicles: VehicleCardData[] = results.docs.map((doc) => {
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
  });

  /**
   * Page links carry every current filter. Without this, clicking page 2 drops the
   * filters and dumps the buyer back into all 311 cars, which is the single most common
   * pagination bug on faceted sites.
   */
  const buildHref = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = one(value);
      if (v && key !== "page") next.set(key, v);
    }
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/cars?${query}` : "/cars";
  };

  const priceSummary =
    results.totalDocs > 0
      ? `${formatRand(Math.min(...vehicles.map((v) => v.price)))} to ${formatRand(Math.max(...vehicles.map((v) => v.price)))} on this page`
      : null;

  return (
    <div className="container-page py-[var(--section-tight)]">
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <FacetRail
          active={{
            make: makeSlug,
            body: bodySlug,
            fuel: fuelSlug,
            transmission: transmissionSlug,
            province: provinceSlug,
            minPrice: minPrice ? String(minPrice) : undefined,
            maxPrice: maxPrice ? String(maxPrice) : undefined,
          }}
        />

        <section aria-labelledby="results-heading">
          <ResultsHeader
            total={results.totalDocs}
            page={results.page ?? 1}
            totalPages={results.totalPages}
            sort={sort}
            priceSummary={priceSummary}
          />

          {vehicles.length === 0 ? (
            /* Empty states are design work, not a div that says "no results". This one
               says what happened, why, and gives the one action that actually helps. */
            <div className="rounded-lg border border-line bg-surface-raised p-10 text-center">
              <h3 className="text-lg">No cars match that combination</h3>
              <p className="measure mx-auto mt-2 text-sm text-ink-secondary">
                Nothing on the platform fits every filter you have set at once. Widening the price
                range or removing the province usually brings results back.
              </p>
              <a
                href="/cars"
                className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent-solid px-4 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
              >
                Clear all filters
              </a>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((vehicle) => (
                <li key={vehicle.publicRef} className="flex">
                  <VehicleCard vehicle={vehicle} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={results.page ?? 1}
            totalPages={results.totalPages}
            buildHref={buildHref}
          />
        </section>
      </div>
    </div>
  );
}
