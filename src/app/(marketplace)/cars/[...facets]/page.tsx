import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { ResultsGrid } from "@/components/vehicles/results-grid";
import { formatRand } from "@/lib/format";
import { PER_PAGE, priceRange, searchVehicles } from "@/lib/search";

/**
 * Facet landing pages.
 *
 * ONE catch-all route resolves every indexable filter shape, because the alternative is
 * eight nested route folders that drift apart. The shapes it accepts are exactly the ones
 * in docs/SITEMAP.md and nothing else:
 *
 *   /cars/[make]                      /cars/toyota
 *   /cars/[make]/[model]              /cars/toyota/hilux           <- the model hub
 *   /cars/[make]/[model]/[variant]    /cars/toyota/hilux/2-8-gd-6-raider
 *   /cars/body/[body]                 /cars/body/bakkie
 *   /cars/fuel/[fuel]                 /cars/fuel/diesel
 *   /cars/in/[province]               /cars/in/gauteng
 *   /cars/in/[province]/[city]        /cars/in/gauteng/pretoria
 *   /cars/new  /cars/demo  /cars/used
 *
 * Anything else 404s rather than rendering an empty result set at a URL Google will then
 * crawl. That is the whole point of a whitelist: the shapes that exist are the shapes we
 * chose, not every combination a crawler can construct.
 *
 * `in`, `body`, `fuel`, `new`, `demo` and `used` are reserved on the makes collection, so a
 * manufacturer can never shadow one of these segments.
 */

type Params = Promise<{ facets: string[] }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const CONDITION_SEGMENTS: Record<string, { value: "new" | "demo" | "pre_owned"; label: string }> = {
  new: { value: "new", label: "New" },
  demo: { value: "demo", label: "Demo" },
  used: { value: "pre_owned", label: "Used" },
};

type Resolved = {
  filters: Parameters<typeof searchVehicles>[0];
  /** Which shape matched, so the copy and the breadcrumbs can differ. */
  kind: "make" | "model" | "variant" | "body" | "fuel" | "province" | "city" | "condition";
  segments: string[];
};

/** Parses a path into a known shape, or null if it is not one we publish. */
function resolveShape(facets: string[]): Resolved | null {
  const [a, b, c] = facets;
  if (!a) return null;

  if (facets.length === 1 && CONDITION_SEGMENTS[a]) {
    return {
      filters: { condition: CONDITION_SEGMENTS[a].value },
      kind: "condition",
      segments: [a],
    };
  }
  if (a === "body" && b && facets.length === 2) {
    return { filters: { body: b }, kind: "body", segments: [a, b] };
  }
  if (a === "fuel" && b && facets.length === 2) {
    return { filters: { fuel: b }, kind: "fuel", segments: [a, b] };
  }
  if (a === "in" && b) {
    if (facets.length === 2)
      return { filters: { province: b }, kind: "province", segments: [a, b] };
    if (facets.length === 3 && c) {
      return { filters: { province: b, city: c }, kind: "city", segments: [a, b, c] };
    }
    return null;
  }
  // Reserved segments are handled above. Anything left in first position is a make.
  if (facets.length === 1) return { filters: { make: a }, kind: "make", segments: [a] };
  if (facets.length === 2 && b) {
    return { filters: { make: a, model: b }, kind: "model", segments: [a, b] };
  }
  if (facets.length === 3 && b && c) {
    return { filters: { make: a, model: b, variant: c }, kind: "variant", segments: [a, b, c] };
  }
  return null;
}

/** Reads the human labels back out, so headings say "Toyota Hilux" not "toyota-hilux". */
async function labelsFor(resolved: Resolved) {
  const payload = await getPayload({ config });
  const lookup = async (collection: string, slug?: string) => {
    if (!slug) return null;
    const found = await payload.find({
      collection: collection as never,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    return (found.docs[0] as { name?: string } | undefined)?.name ?? null;
  };

  const f = resolved.filters;
  const [make, model, variant, body, fuel, province, city] = await Promise.all([
    lookup("makes", f.make),
    lookup("models", f.model),
    lookup("variants", f.variant),
    lookup("body-types", f.body),
    lookup("fuel-types", f.fuel),
    lookup("provinces", f.province),
    lookup("cities", f.city),
  ]);
  return { make, model, variant, body, fuel, province, city };
}

function headingFor(
  kind: Resolved["kind"],
  labels: Awaited<ReturnType<typeof labelsFor>>,
  segments: string[],
): string {
  switch (kind) {
    case "make":
      return `${labels.make} cars for sale`;
    case "model":
      return `${labels.make} ${labels.model} for sale`;
    case "variant":
      return `${labels.make} ${labels.model} ${labels.variant} for sale`;
    case "body":
      return `${labels.body}s for sale`;
    case "fuel":
      return `${labels.fuel} cars for sale`;
    case "province":
      return `Cars for sale in ${labels.province}`;
    case "city":
      return `Cars for sale in ${labels.city}`;
    case "condition":
      return `${CONDITION_SEGMENTS[segments[0] ?? ""]?.label ?? ""} cars for sale`;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { facets } = await params;
  const resolved = resolveShape(facets);
  if (!resolved) return { title: "Not found" };

  const labels = await labelsFor(resolved);
  const heading = headingFor(resolved.kind, labels, resolved.segments);
  const { total } = await searchVehicles({ ...resolved.filters, page: 1 });
  const range = await priceRange(resolved.filters);
  const path = `/cars/${resolved.segments.join("/")}`;

  return {
    title: heading,
    description: [
      `${total} ${total === 1 ? "vehicle" : "vehicles"} from verified South African dealerships`,
      range ? `from ${formatRand(range.min)} to ${formatRand(range.max)}` : null,
      "No private sellers.",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical: path },
    /**
     * A landing page with no stock is noindex, follow rather than a 404.
     *
     * Stock comes and goes: a make with nothing today has three next week. Removing the URL
     * throws away whatever ranking it had and creates a redirect to manage. Keeping it and
     * telling Google not to index it right now costs nothing and recovers by itself.
     */
    robots: total === 0 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function FacetPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { facets } = await params;
  const query = await searchParams;
  const resolved = resolveShape(facets);
  if (!resolved) notFound();

  const page = Math.max(1, Number(one(query.page) ?? 1) || 1);
  const sort = one(query.sort) ?? "newest";

  const results = await searchVehicles({ ...resolved.filters, page, sort });

  // An unknown make or model is a 404, not an empty page. A crawler that finds
  // /cars/toyata should be told it does not exist rather than shown every Toyota.
  if (Object.values(results.unresolved).some(Boolean)) notFound();

  const labels = await labelsFor(resolved);
  const heading = headingFor(resolved.kind, labels, resolved.segments);
  const range = await priceRange(resolved.filters);
  const basePath = `/cars/${resolved.segments.join("/")}`;

  const trail: Crumb[] = [{ href: "/cars", label: "Cars for sale" }];
  if (resolved.kind === "model" || resolved.kind === "variant") {
    trail.push({ href: `/cars/${resolved.segments[0]}`, label: labels.make ?? "" });
  }
  if (resolved.kind === "variant") {
    trail.push({
      href: `/cars/${resolved.segments[0]}/${resolved.segments[1]}`,
      label: labels.model ?? "",
    });
  }
  if (resolved.kind === "city") {
    trail.push({ href: `/cars/in/${resolved.segments[1]}`, label: labels.province ?? "" });
  }
  trail.push({ href: basePath, label: heading });

  const buildHref = (target: number) => {
    const next = new URLSearchParams();
    if (sort !== "newest") next.set("sort", sort);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={trail} />

      <div className="mt-5 border-b border-line pb-5">
        <h1 className="text-3xl">{heading}</h1>
        <p aria-live="polite" className="mt-2 text-sm text-ink-secondary">
          <span className="font-semibold tabular text-ink">
            {results.total.toLocaleString("en-ZA")}
          </span>{" "}
          {results.total === 1 ? "vehicle" : "vehicles"} from verified dealerships
          {range ? (
            <>
              , from <span className="tabular">{formatRand(range.min)}</span> to{" "}
              <span className="tabular">{formatRand(range.max)}</span>
            </>
          ) : null}
        </p>
        <p className="mt-3 text-sm">
          <Link href="/cars" className="font-semibold text-accent hover:underline">
            Search all stock with filters
          </Link>
        </p>
      </div>

      <div className="mt-6">
        <ResultsGrid
          vehicles={results.vehicles}
          page={results.page}
          totalPages={results.totalPages}
          buildHref={buildHref}
          emptyTitle={`No ${heading.replace(" for sale", "").toLowerCase()} right now`}
          emptyBody="Nothing matching this is on the platform at the moment. Stock changes daily, so it is worth checking back, and there is plenty else in the meantime."
        />
      </div>

      {/* Per-page count is not shown because it is always PER_PAGE except on the last page,
          and a number that is almost always the same is noise rather than information. */}
      <p className="sr-only">Showing up to {PER_PAGE} vehicles per page.</p>
    </div>
  );
}
