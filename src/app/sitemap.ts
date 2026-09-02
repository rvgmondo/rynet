import config from "@payload-config";
import type { MetadataRoute } from "next";
import { getPayload } from "payload";

import { SERVICES } from "@/content/agency/services";
import { vehicleUrl } from "@/lib/urls";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";

/**
 * The sitemap.
 *
 * Two rules govern what goes in, and both are about not wasting crawl budget.
 *
 * **Only indexable shapes.** The facet URLs listed here are exactly the ones in
 * docs/SITEMAP.md. Nothing built from a query string appears, because those are blocked in
 * robots.txt and submitting a blocked URL is a contradiction Google reports as an error.
 *
 * **Only pages with stock.** A make with nothing live is left out rather than submitted and
 * then found empty. The floor is three vehicles: enough that the page has something to say.
 * Submitting empty pages at scale is how a large site earns a crawl-budget problem, and it
 * is a slow one to recover from.
 *
 * `lastmod` is real, taken from the document, not `new Date()`. A sitemap where every entry
 * changed today is a sitemap Google learns to ignore.
 *
 * When this grows past roughly 45 000 URLs it has to split into an index plus chunks. At
 * 311 vehicles that is a long way off, and building the splitter now would be guessing at
 * the shape. The threshold is written here so it is noticed rather than discovered.
 */

/**
 * Generated per request rather than at build.
 *
 * A sitemap frozen at build time tells Google about the stock we had when we last deployed,
 * which on a marketplace is worse than not having one: it submits URLs for vehicles that
 * have sold and omits everything listed since. It also cannot be built where there is no
 * database, which broke the deploy pipeline.
 *
 * Crawlers fetch this rarely, so the cost of generating it live is not a concern.
 */
export const dynamic = "force-dynamic";

const MINIMUM_STOCK_TO_LIST = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/cars`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/dealers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/how-verification-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/accessibility`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cookies`, changeFrequency: "yearly", priority: 0.3 },

    // Rynet Digital. Listed from the same content module the pages render from, so a new
    // service page cannot exist without appearing here.
    { url: `${SITE}/digital`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/digital/services`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/digital/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/digital/process`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/digital/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/digital/contact`, changeFrequency: "monthly", priority: 0.6 },
    ...SERVICES.map((service) => ({
      url: `${SITE}/digital/services/${service.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // ------------------------------------------------------------------ vehicles
  const vehicles = await payload.find({
    collection: "vehicles",
    where: { status: { equals: "live" } },
    limit: 5000,
    depth: 1,
    sort: "-publishedAt",
  });

  for (const vehicle of vehicles.docs) {
    const make = vehicle.make;
    const model = vehicle.model;
    const variant = vehicle.variant;
    if (typeof make === "number" || typeof model === "number") continue;

    entries.push({
      url: `${SITE}${vehicleUrl({
        makeSlug: make.slug,
        modelSlug: model.slug,
        modelYear: vehicle.modelYear,
        variantName: typeof variant === "object" && variant ? variant.name : null,
        publicRef: vehicle.publicRef ?? "",
      })}`,
      lastModified: vehicle.updatedAt ? new Date(vehicle.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // --------------------------------------------------------------- dealerships
  const dealers = await payload.find({
    collection: "dealers",
    where: { verificationStatus: { equals: "verified" } },
    limit: 500,
    depth: 0,
  });

  for (const dealer of dealers.docs) {
    entries.push({
      url: `${SITE}/dealers/${dealer.slug}`,
      lastModified: dealer.updatedAt ? new Date(dealer.updatedAt) : undefined,
      changeFrequency: "daily",
      priority: 0.6,
    });
  }

  // ------------------------------------------------------- facet landing pages
  //
  // Counted rather than assumed. A make with two cars is left out: the page exists and
  // works, it is simply not worth a crawler's time yet, and it will be included the moment
  // it has stock.
  const withStock = async (collection: string, field: string, prefix: string, priority: number) => {
    const docs = await payload.find({
      collection: collection as never,
      where: { isActive: { equals: true } },
      limit: 300,
      depth: 0,
    });

    for (const doc of docs.docs as never as { id: number; slug: string; updatedAt?: string }[]) {
      const count = await payload.count({
        collection: "vehicles",
        where: { and: [{ status: { equals: "live" } }, { [field]: { equals: doc.id } }] } as never,
      });
      if (count.totalDocs < MINIMUM_STOCK_TO_LIST) continue;

      entries.push({
        url: `${SITE}${prefix}/${doc.slug}`,
        changeFrequency: "daily",
        priority,
      });
    }
  };

  await withStock("makes", "make", "/cars", 0.8);
  await withStock("body-types", "bodyType", "/cars/body", 0.7);
  await withStock("fuel-types", "fuelType", "/cars/fuel", 0.6);

  // Make and model pairs, which are the model hub pages and the ones that rank.
  const models = await payload.find({ collection: "models", limit: 500, depth: 1 });
  for (const model of models.docs) {
    const make = model.make;
    if (typeof make === "number" || !make) continue;

    const count = await payload.count({
      collection: "vehicles",
      where: { and: [{ status: { equals: "live" } }, { model: { equals: model.id } }] },
    });
    if (count.totalDocs < MINIMUM_STOCK_TO_LIST) continue;

    entries.push({
      url: `${SITE}/cars/${make.slug}/${model.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // Provinces, which are the location landing pages.
  const provinces = await payload.find({ collection: "provinces", limit: 20, depth: 0 });
  for (const province of provinces.docs) {
    const branches = await payload.find({
      collection: "branches",
      where: { province: { equals: province.id } },
      limit: 500,
      depth: 0,
    });
    if (branches.docs.length === 0) continue;

    const count = await payload.count({
      collection: "vehicles",
      where: {
        and: [{ status: { equals: "live" } }, { branch: { in: branches.docs.map((b) => b.id) } }],
      },
    });
    if (count.totalDocs < MINIMUM_STOCK_TO_LIST) continue;

    entries.push({
      url: `${SITE}/cars/in/${province.slug}`,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}
