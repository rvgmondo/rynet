import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Crumb } from "@/components/layout/breadcrumbs";
import { summarise, tally } from "@/components/search/match";
import { hrefFor, type RawParams, readState, type SearchState } from "@/components/search/params";
import { type RelatedGroup, RelatedLinks } from "@/components/search/related-links";
import { SearchScreen } from "@/components/search/search-screen";
import { type Resolved, runSearch, type SearchSet, searchSet } from "@/components/search/stock";
import { formatRand } from "@/lib/format";
import { safePage } from "@/lib/search";

/**
 * Facet landing pages.
 *
 * ONE catch-all route resolves every indexable filter shape, because the alternative is eight
 * nested route folders that drift apart. The shapes it accepts are exactly the ones in
 * docs/SITEMAP.md and nothing else:
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
 * Anything else 404s rather than rendering an empty result set at a URL a crawler will then
 * index. That includes a slug that does not exist, and a real slug in the wrong place: a Hilux
 * under Ford, a variant under the wrong model, a town in the wrong province. `in`, `body`, `fuel`,
 * `new`, `demo` and `used` are reserved on the makes collection, so a manufacturer can never shadow
 * one of these segments.
 *
 * The page is the same results screen as /cars (src/components/search/search-screen.tsx) with its
 * own heading, one sentence of facts about the set and links onward. Its filters post to /cars
 * with this page's facet already ticked, so refining a landing page never loses what it was about.
 */

type Params = Promise<{ facets: string[] }>;
type Search = Promise<RawParams>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const CONDITION_SEGMENTS: Record<string, { value: "new" | "demo" | "pre_owned"; label: string }> = {
  new: { value: "new", label: "New" },
  // "Ex-demo", never "Demo": on this platform "demo" also marks example data, and a page headed
  // "Demo cars" would read as a page of fake listings.
  demo: { value: "demo", label: "Ex-demo" },
  used: { value: "pre_owned", label: "Used" },
};

type Kind = "make" | "model" | "variant" | "body" | "fuel" | "province" | "city" | "condition";

type Shape = {
  kind: Kind;
  segments: string[];
  /** The search this page is, before a sort or page is applied. */
  state: Partial<SearchState>;
};

/** Parses a path into a known shape, or null if it is not one we publish. */
function resolveShape(facets: string[]): Shape | null {
  const [a, b, c] = facets;
  if (!a) return null;

  const condition = CONDITION_SEGMENTS[a];
  if (facets.length === 1 && condition) {
    return { kind: "condition", segments: [a], state: { condition: condition.value } };
  }
  if (a === "body" && b && facets.length === 2) {
    return { kind: "body", segments: [a, b], state: { body: [b] } };
  }
  if (a === "fuel" && b && facets.length === 2) {
    return { kind: "fuel", segments: [a, b], state: { fuel: [b] } };
  }
  if (a === "in" && b) {
    if (facets.length === 2) {
      return { kind: "province", segments: [a, b], state: { province: [b] } };
    }
    if (facets.length === 3 && c) {
      return { kind: "city", segments: [a, b, c], state: { province: [b], city: c } };
    }
    return null;
  }
  // Reserved segments are handled above. Anything left in first position is a make.
  if (facets.length === 1) return { kind: "make", segments: [a], state: { make: [a] } };
  if (facets.length === 2 && b) {
    return { kind: "model", segments: [a, b], state: { make: [a], model: [b] } };
  }
  if (facets.length === 3 && b && c) {
    return { kind: "variant", segments: [a, b, c], state: { make: [a], model: [b], variant: c } };
  }
  return null;
}

/** True when every slug exists and each one sits under the parent the path puts it under. */
function belongs(shape: Shape, resolved: Resolved): boolean {
  if (resolved.missing.length > 0) return false;
  const { make, model, variant, body, fuel, province, city } = resolved.terms;
  switch (shape.kind) {
    case "make":
      return make.length === 1;
    case "model":
      return make.length === 1 && model.length === 1 && model[0]?.make === make[0]?.id;
    case "variant":
      return (
        make.length === 1 &&
        model.length === 1 &&
        model[0]?.make === make[0]?.id &&
        Boolean(variant) &&
        variant?.parent === model[0]?.id
      );
    case "city":
      return province.length === 1 && Boolean(city) && city?.parent === province[0]?.id;
    case "province":
      return province.length === 1;
    case "body":
      return body.length === 1;
    case "fuel":
      return fuel.length === 1;
    case "condition":
      return true;
  }
}

function stateFor(shape: Shape, sort: string | undefined): SearchState {
  return { ...readState({ sort }), ...shape.state };
}

/** "Bakkie" becomes "bakkie" mid-sentence; "SUV" and "MPV" stay as they are. */
const common = (name: string) => (/^[A-Z0-9]+$/.test(name) ? name : name.toLowerCase());
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The page's heading, its short name for the breadcrumb, and the noun for its empty state. */
function wordsFor(shape: Shape, resolved: Resolved) {
  const { make, model, variant, body, fuel, province, city } = resolved.terms;
  const makeName = make[0]?.name ?? "";
  const modelName = model[0]?.name ?? "";
  switch (shape.kind) {
    case "make":
      return { heading: `${makeName} cars for sale`, short: makeName, noun: `${makeName} cars` };
    case "model":
      return {
        heading: `${makeName} ${modelName} for sale`,
        short: modelName,
        noun: `${makeName} ${modelName}`,
      };
    case "variant": {
      const name = `${makeName} ${modelName} ${variant?.name ?? ""}`;
      return { heading: `${name} for sale`, short: variant?.name ?? "", noun: name };
    }
    case "body": {
      const plural = `${common(body[0]?.name ?? "")}s`;
      return { heading: `${capital(plural)} for sale`, short: capital(plural), noun: plural };
    }
    case "fuel": {
      const plural = `${common(fuel[0]?.name ?? "")} cars`;
      return { heading: `${capital(plural)} for sale`, short: capital(plural), noun: plural };
    }
    case "province": {
      const name = province[0]?.name ?? "";
      return { heading: `Cars for sale in ${name}`, short: name, noun: `cars in ${name}` };
    }
    case "city": {
      const name = city?.name ?? "";
      return { heading: `Cars for sale in ${name}`, short: name, noun: `cars in ${name}` };
    }
    case "condition": {
      const label = CONDITION_SEGMENTS[shape.segments[0] ?? ""]?.label ?? "";
      return {
        heading: `${label} cars for sale`,
        short: `${label} cars`,
        noun: `${label.toLowerCase()} cars`,
      };
    }
  }
}

async function load(facets: string[], sort: string | undefined) {
  const shape = resolveShape(facets);
  if (!shape) return null;
  // No widening on a landing page: "Cars for sale in Pretoria" holds cars in Pretoria or nothing.
  const set = await searchSet(stateFor(shape, sort), { widen: false });
  if (!belongs(shape, set.resolved)) return null;
  return { shape, set, words: wordsFor(shape, set.resolved) };
}

const rangeText = (min: number | null, max: number | null) => {
  if (min === null || max === null) return null;
  return min === max
    ? `priced at ${formatRand(min)}`
    : `priced from ${formatRand(min)} to ${formatRand(max)}`;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { facets } = await params;
  const loaded = await load(facets, undefined);
  if (!loaded) return { title: "Not found" };

  const { shape, set, words } = loaded;
  const total = set.matching.length;
  const summary = summarise(set.matching);
  const range = rangeText(summary.minPrice, summary.maxPrice);

  return {
    title: words.heading,
    description: [
      `${words.heading} from South African dealerships on Rynet`,
      range ? `, ${range}` : "",
      ". Filter by price, year, mileage and province. No private sellers.",
    ].join(""),
    alternates: { canonical: `/cars/${shape.segments.join("/")}` },
    /**
     * A landing page with no stock is noindex, follow rather than a 404.
     *
     * Stock comes and goes: a make with nothing today has three next week. Removing the URL
     * throws away whatever ranking it had and creates a redirect to manage. Keeping it and
     * telling crawlers not to index it right now costs nothing and recovers by itself.
     */
    robots: total === 0 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/**
 * Links onward from a landing page. Every count is the count of the page the link leads to, so a
 * number never changes between the chip and the page it opens.
 */
function relatedFor(shape: Shape, set: SearchSet, words: { short: string }): RelatedGroup[] {
  const { rows, matching, taxonomy, resolved } = set;
  const { make, model, variant, province, city } = resolved.terms;
  const TOP = 8;
  type Row = (typeof rows)[number];

  const modelLinks = (source: Row[], except?: number) =>
    tally(source, "model")
      .filter(([id]) => id !== except)
      .slice(0, TOP)
      .flatMap(([id]) => {
        const term = taxonomy.models.find((m) => m.id === id);
        const owner = taxonomy.makes.find((m) => m.id === term?.make);
        if (!term || !owner) return [];
        return [
          {
            href: `/cars/${owner.slug}/${term.slug}`,
            label: `${owner.name} ${term.name}`,
            count: rows.filter((row) => row.model === id).length,
          },
        ];
      });

  const provinceLinks = () =>
    tally(rows, "province").flatMap(([id, count]) => {
      const term = taxonomy.provinces.find((p) => p.id === id);
      return term ? [{ href: `/cars/in/${term.slug}`, label: term.name, count }] : [];
    });

  const variantLinks = (source: Row[], except?: number) => {
    const owner = make[0];
    const parent = model[0];
    if (!owner || !parent) return [];
    return tally(source, "variant")
      .filter(([id]) => id !== except)
      .slice(0, TOP)
      .flatMap(([id, count]) => {
        const term = taxonomy.variants.find((v) => v.id === id);
        return term
          ? [{ href: `/cars/${owner.slug}/${parent.slug}/${term.slug}`, label: term.name, count }]
          : [];
      });
  };

  const cityLinks = (source: Row[], provinceSlug: string, except?: number) =>
    tally(source, "city")
      .filter(([id]) => id !== except)
      .slice(0, TOP)
      .flatMap(([id, count]) => {
        const term = taxonomy.cities.find((c) => c.id === id);
        return term
          ? [{ href: `/cars/in/${provinceSlug}/${term.slug}`, label: term.name, count }]
          : [];
      });

  switch (shape.kind) {
    case "make":
      return [
        { title: `${words.short} models`, links: modelLinks(matching) },
        { title: "Cars by province", links: provinceLinks() },
      ];
    case "model": {
      const owner = make[0];
      return [
        { title: `${model[0]?.name} variants`, links: variantLinks(matching) },
        {
          title: `Other ${owner?.name} models`,
          links: modelLinks(
            rows.filter((row) => row.make === owner?.id),
            model[0]?.id,
          ),
        },
      ];
    }
    case "variant":
      return [
        {
          title: `Other ${model[0]?.name} variants`,
          links: variantLinks(
            rows.filter((row) => row.model === model[0]?.id),
            variant?.id,
          ),
        },
      ];
    case "province": {
      const here = province[0];
      return [
        { title: `Towns in ${here?.name}`, links: here ? cityLinks(matching, here.slug) : [] },
        {
          title: "Other provinces",
          links: provinceLinks().filter((link) => link.label !== here?.name),
        },
      ];
    }
    case "city": {
      const here = province[0];
      return [
        {
          title: `Other towns in ${here?.name}`,
          links: here
            ? cityLinks(
                rows.filter((row) => row.province === here.id),
                here.slug,
                city?.id,
              )
            : [],
        },
      ];
    }
    default:
      return [
        { title: "Popular models", links: modelLinks(matching) },
        { title: "Cars by province", links: provinceLinks() },
      ];
  }
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
  const sort = one(query.sort);

  const loaded = await load(facets, sort);
  if (!loaded) notFound();
  const { shape, words } = loaded;

  // Clamped at both ends (see safePage). A page past the last one shows the last page.
  const state = stateFor(shape, sort);
  const run = await runSearch(state, safePage(one(query.page) ?? 1), { widen: false });
  const basePath = `/cars/${shape.segments.join("/")}`;

  // Breadcrumbs: the visible trail is Home and the parents; the structured data carries the page.
  const { make, model, province } = run.resolved.terms;
  const trail: Crumb[] = [{ href: "/cars", label: "Cars for sale" }];
  if ((shape.kind === "model" || shape.kind === "variant") && make[0]) {
    trail.push({ href: `/cars/${make[0].slug}`, label: make[0].name });
  }
  if (shape.kind === "variant" && make[0] && model[0]) {
    trail.push({ href: `/cars/${make[0].slug}/${model[0].slug}`, label: model[0].name });
  }
  if (shape.kind === "city" && province[0]) {
    trail.push({ href: `/cars/in/${province[0].slug}`, label: province[0].name });
  }
  trail.push({ href: basePath, label: words.short });

  // Page links keep the sort order, and nothing else: a landing page reads no other parameter.
  const sortPairs: [string, string][] = state.sort !== "newest" ? [["sort", state.sort]] : [];
  const buildHref = (target: number) =>
    hrefFor(basePath, target > 1 ? [...sortPairs, ["page", String(target)]] : sortPairs);

  /*
   * One sentence of facts about THIS set, all of it counted from the cars on the page: the price
   * range, the model years and how widely it is spread. The price range used to be the whole
   * catalogue's on every province, city, fuel and condition page, so /cars/in/limpopo, which holds
   * nothing, claimed stock "from R 83 300 to R 1 489 600". An empty set states nothing; its empty
   * state says what there is to say.
   *
   * The number of dealerships is only stated for real stock. For demonstration stock it would be a
   * count of businesses that do not exist, in the one sentence written to be quoted.
   */
  const summary = summarise(run.matching);
  const parts: string[] = [];
  const range = rangeText(summary.minPrice, summary.maxPrice);
  if (range) parts.push(capital(range));
  if (summary.minYear && summary.maxYear) {
    parts.push(
      summary.minYear === summary.maxYear
        ? `all ${summary.minYear} models`
        : `model years ${summary.minYear} to ${summary.maxYear}`,
    );
  }
  const local = shape.kind === "province" || shape.kind === "city";
  if (summary.demo === 0 && summary.dealers > 0) {
    const spread = !local && summary.provinces > 1 ? ` in ${summary.provinces} provinces` : "";
    parts.push(
      `listed by ${summary.dealers} ${summary.dealers === 1 ? "dealership" : "dealerships"}${spread}`,
    );
  } else if (!local && summary.provinces > 1) {
    parts.push(`across ${summary.provinces} provinces`);
  }
  const intro = run.total > 0 && parts.length > 0 ? `${parts.join(", ")}.` : undefined;

  return (
    <SearchScreen
      run={run}
      heading={words.heading}
      trail={trail}
      intro={intro}
      sortAction={basePath}
      sortCarried={[]}
      buildHref={buildHref}
      empty={{
        title: `No ${words.noun} right now`,
        body: "Nothing like this is listed at the moment. Check back later, or browse every car on Rynet.",
        href: "/cars",
        action: "See all cars",
      }}
      related={
        <RelatedLinks
          id="related-heading"
          title="Keep browsing"
          groups={relatedFor(shape, run, words)}
        />
      }
    />
  );
}
