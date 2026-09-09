import config from "@payload-config";
import type { Metadata } from "next";
import { getPayload } from "payload";

import { FacetRail } from "@/components/vehicles/facet-rail";
import { ResultsGrid } from "@/components/vehicles/results-grid";
import { ResultsHeader } from "@/components/vehicles/results-header";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { formatRand } from "@/lib/format";
import { resolveQuery, toCard } from "@/lib/search";

export const metadata: Metadata = {
  title: "Cars for sale from verified dealerships",
  description:
    "Search used, demo and new cars from registered South African dealerships. Filter by make, model, price, body type, transmission and province. No private sellers.",
  /*
   * Every query variant of this page canonicalises to /cars.
   *
   * There was no canonical at all, so ?q=, ?colour=, ?sort= and every combination of facets
   * each declared itself the original of a page with the same 311 cars on it. robots.txt
   * already asks crawlers not to fetch /cars?, but a canonical is what consolidates the ones
   * that arrive anyway, from a share or a link. The real landing pages under /cars/body/,
   * /cars/fuel/ and /cars/in/ set their own canonicals and are unaffected.
   */
  alternates: { canonical: "/cars" },
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

  /*
   * What someone typed into the search box, resolved into the same filters the rail
   * produces. Explicit parameters always win, so a buyer who searches "bakkie under 300"
   * and then ticks "Diesel" in the rail keeps both, and the rail is never overruled by the
   * text they typed two clicks ago.
   *
   * This used to do nothing at all: the box on the 404 page sent ?q= here and this page
   * ignored it, so the only search box on the site was decoration.
   */
  const query = one(params.q);
  const parsed = await resolveQuery(query);

  /*
   * A search that understood nothing must not answer with everything.
   *
   * "asdfgh" parsed to no filters at all, so the page fell through to the unfiltered query
   * and presented all 311 cars under the heading the buyer had just searched. That is worse
   * than returning nothing: it looks like a result, and the buyer scrolls a list that has no
   * relationship to what they typed. If a query was given and none of it resolved, the
   * result set is deliberately empty and the empty state explains why.
   */
  const queryUnderstood =
    !query ||
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

  const makeSlug = one(params.make) ?? parsed.make;
  const modelSlug = one(params.model) ?? parsed.model;
  const bodySlug = one(params.body) ?? parsed.body;
  const fuelSlug = one(params.fuel) ?? parsed.fuel;
  const transmissionSlug = one(params.transmission) ?? parsed.transmission;
  const provinceSlug = one(params.province) ?? parsed.province;
  const citySlug = one(params.city) ?? parsed.city;
  const colourSlug = one(params.colour);
  const minPrice = Number(one(params.minPrice) ?? 0) || parsed.minPrice;
  const maxPrice = Number(one(params.maxPrice) ?? 0) || parsed.maxPrice;

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

  const [makeId, modelId, bodyId, fuelId, transmissionId, provinceId, cityId, colourId] =
    await Promise.all([
      resolve("makes", makeSlug),
      resolve("models", modelSlug),
      resolve("body-types", bodySlug),
      resolve("fuel-types", fuelSlug),
      resolve("transmissions", transmissionSlug),
      resolve("provinces", provinceSlug),
      resolve("cities", citySlug),
      resolve("colours", colourSlug),
    ]);

  // Location filters through the branch, so it needs the branch ids first.
  let branchIds: number[] | undefined;
  if (provinceId || cityId) {
    const branches = await payload.find({
      collection: "branches",
      where: cityId ? { city: { equals: cityId } } : { province: { equals: provinceId } },
      limit: 500,
      depth: 0,
    });
    branchIds = branches.docs.map((b) => b.id);
    // A location with no branches means no stock, and an empty `in` clause would otherwise
    // match everything rather than nothing.
    if (branchIds.length === 0) branchIds = [-1];
  }

  const where: Record<string, unknown> = { status: { equals: "live" } };
  // -1 is an id no row has, which is how "match nothing" is expressed without a special case
  // running through every clause below.
  if (!queryUnderstood) where.id = { equals: -1 };
  if (makeId) where.make = { equals: makeId };
  if (modelId) where.model = { equals: modelId };
  if (bodyId) where.bodyType = { equals: bodyId };
  if (fuelId) where.fuelType = { equals: fuelId };
  if (transmissionId) where.transmission = { equals: transmissionId };
  if (colourId) where.exteriorColour = { equals: colourId };
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

  // How much of this result set is seeded example stock, so the page can say so once at the
  // top rather than leaving it to a marker on each card.
  const demonstration = await payload.count({
    collection: "vehicles",
    where: { and: [where, { isDemonstration: { equals: true } }] } as never,
  });

  // The shared mapper. This page used to carry a verbatim copy of it, which is how the
  // paint colour reached the card in one place and not the other two.
  const vehicles: VehicleCardData[] = results.docs.map(toCard);

  /**
   * Page links carry every current filter. Without this, clicking page 2 drops the
   * filters and dumps the buyer back into all 311 cars, which is the single most common
   * pagination bug on faceted sites.
   */
  /*
   * Every filter the buyer arrived with, as hidden inputs for the sort form.
   *
   * A GET form submits only its own controls, so the sort control was posting `sort` alone
   * and throwing away the search term, the colour and every ticked facet. Choosing "price,
   * low to high" on a filtered result set dumped the buyer back into all 311 cars, which is
   * the same class of bug the facet rail had, in the one control a buyer is most likely to
   * touch after filtering.
   */
  const carried = Object.entries(params)
    .map(([key, value]) => ({ key, value: one(value) }))
    .filter((entry): entry is { key: string; value: string } =>
      Boolean(entry.value && entry.key !== "sort" && entry.key !== "page"),
    );

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

  /*
   * The price range on THIS page, and only when this page has cars on it.
   *
   * `results.totalDocs > 0` was the wrong guard: a page number past the last page returns a
   * non-zero total with an empty `docs` array, and Math.min of nothing is Infinity, so the
   * page printed "R Infinity to R -Infinity on this page" and still answered 200.
   */
  const priceSummary =
    vehicles.length > 0
      ? `${formatRand(Math.min(...vehicles.map((v) => v.price)))} to ${formatRand(Math.max(...vehicles.map((v) => v.price)))} on this page`
      : null;

  return (
    <div className="container-page py-[var(--section-tight)]">
      {/*
        A ruled column boundary rather than a gap. The rail sits on the sunken ground and the
        results run the FULL width to the container maximum: centring them at a text measure
        is what makes a marketplace read as a blog, and it is what left the old page with an
        empty right half.
      */}
      <div className="grid gap-0 lg:grid-cols-[17.5rem_1fr] lg:divide-x lg:divide-line-strong">
        <FacetRail
          active={{
            make: makeSlug,
            body: bodySlug,
            fuel: fuelSlug,
            transmission: transmissionSlug,
            province: provinceSlug,
            minPrice: minPrice ? String(minPrice) : undefined,
            maxPrice: maxPrice ? String(maxPrice) : undefined,
            // Carried through as hidden inputs so applying a facet does not silently drop
            // the text someone searched for, or the colour they picked off the home page.
            q: query,
            colour: colourSlug,
          }}
        />

        <section aria-labelledby="results-heading" className="order-1 pb-10 lg:order-2 lg:ps-8">
          <ResultsHeader
            total={results.totalDocs}
            page={results.page ?? 1}
            totalPages={results.totalPages}
            sort={sort}
            priceSummary={priceSummary}
            query={query}
            understood={parsed.matched}
            ignored={parsed.unmatched}
            demonstrationCount={demonstration.totalDocs}
            filters={carried}
          />

          <ResultsGrid
            vehicles={vehicles}
            page={results.page ?? 1}
            totalPages={results.totalPages}
            buildHref={buildHref}
            emptyAction="Clear all filters"
          />
        </section>
      </div>
    </div>
  );
}
