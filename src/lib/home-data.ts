import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload, type Where } from "payload";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { toCard } from "@/lib/search";

/**
 * What the home page needs to be a marketplace rather than a brochure.
 *
 * The home page fetched nothing at all and showed no cars, which is the single biggest
 * reason it read as cheap: a marketplace whose front page has nothing to buy is a leaflet.
 * Everything here is deliberately cheap to compute, because this is the most requested page
 * on the site and it renders on demand against SQLite.
 */

export type BrowseTile = {
  slug: string;
  name: string;
  count: number;
};

export type ColourTile = BrowseTile & {
  swatch: string | null;
  family: string | null;
};

export type HomeData = {
  featured: VehicleCardData[];
  bodyTypes: BrowseTile[];
  provinces: BrowseTile[];
  colours: ColourTile[];
  totalLive: number;
  dealershipCount: number;
  /**
   * The same two counts with the seeded demonstration data taken out.
   *
   * These are the only figures the page is allowed to shout. `totalLive` counts everything
   * that renders, which today is 311 listings from 12 dealerships that do not exist, and
   * putting that number at poster scale would be exactly the fabricated statistic the brief
   * forbids. See the numbers band in the home page.
   */
  realLive: number;
  realDealershipCount: number;
  /**
   * How many of the live listings are seeded demonstration stock.
   *
   * The home page states this out loud rather than shouting a headline count that is not
   * what it appears to be. Every seeded listing carries `isDemonstration`, and a figure at
   * poster scale that quietly includes them would be exactly the fabricated statistic the
   * brief forbids.
   */
  demonstrationCount: number;
};

const MIN_TO_SHOW = 1;

/**
 * Featured stock, spread across dealerships.
 *
 * One dealership uploading forty cars in an afternoon would otherwise own the entire front
 * page, which is both ugly and unfair to everyone else. So this takes the newest listings
 * and keeps at most two from any one dealership.
 */
function spreadAcrossDealers(cards: VehicleCardData[], limit: number, perDealer = 2) {
  const seen = new Map<string, number>();
  const chosen: VehicleCardData[] = [];

  for (const card of cards) {
    const used = seen.get(card.dealerSlug) ?? 0;
    if (used >= perDealer) continue;
    seen.set(card.dealerSlug, used + 1);
    chosen.push(card);
    if (chosen.length >= limit) break;
  }

  return chosen;
}

async function readHomeData(featuredLimit: number): Promise<HomeData> {
  const payload = await getPayload({ config });

  const live = { status: { equals: "live" } } as const;

  // Over-fetch so the spread has something to choose from, then trim.
  const recent = await payload.find({
    collection: "vehicles",
    where: live,
    sort: "-publishedAt",
    limit: featuredLimit * 6,
    depth: 2,
  });

  const featured = spreadAcrossDealers(recent.docs.map(toCard), featuredLimit);

  const [bodyDocs, provinceDocs, colourDocs, total, demonstration, dealers, realDealers] =
    await Promise.all([
      payload.find({
        collection: "body-types",
        where: { isActive: { equals: true } },
        limit: 30,
        depth: 0,
      }),
      payload.find({ collection: "provinces", limit: 20, depth: 0, sort: "name" }),
      payload.find({ collection: "colours", limit: 60, depth: 0, sort: "name" }),
      payload.count({ collection: "vehicles", where: live }),
      payload.count({
        collection: "vehicles",
        where: { and: [live, { isDemonstration: { equals: true } }] },
      }),
      payload.count({
        collection: "dealers",
        where: { verificationStatus: { equals: "verified" } },
      }),
      payload.count({
        collection: "dealers",
        where: {
          and: [
            { verificationStatus: { equals: "verified" } },
            { isDemonstration: { not_equals: true } },
          ],
        },
      }),
    ]);

  // Counted rather than assumed. A browse tile promising SUVs and landing on an empty result
  // is worse than not offering the tile, and the counts are the reason to click.
  // Typed as Where explicitly. TypeScript infers Record<string, unknown> from an inline
  // object literal, which is not assignable, and this exact shape has bitten this codebase
  // three times now.
  const countLive = async (clause: Where) =>
    (await payload.count({ collection: "vehicles", where: { and: [live, clause] } })).totalDocs;

  const bodyTypes = (
    await Promise.all(
      bodyDocs.docs.map(async (body) => ({
        slug: body.slug,
        name: body.name,
        count: await countLive({ bodyType: { equals: body.id } }),
      })),
    )
  )
    .filter((tile) => tile.count >= MIN_TO_SHOW)
    .sort((a, b) => b.count - a.count);

  const colours = (
    await Promise.all(
      colourDocs.docs.map(async (colour) => ({
        slug: colour.slug,
        name: colour.name,
        swatch: (colour as { swatch?: string | null }).swatch ?? null,
        family: (colour as { family?: string | null }).family ?? null,
        count: await countLive({ exteriorColour: { equals: colour.id } }),
      })),
    )
  )
    .filter((tile) => tile.count >= MIN_TO_SHOW)
    .sort((a, b) => b.count - a.count);

  const provinces = (
    await Promise.all(
      provinceDocs.docs.map(async (province) => {
        const branches = await payload.find({
          collection: "branches",
          where: { province: { equals: province.id } },
          limit: 500,
          depth: 0,
        });
        if (branches.docs.length === 0)
          return { slug: province.slug, name: province.name, count: 0 };

        return {
          slug: province.slug,
          name: province.name,
          count: await countLive({ branch: { in: branches.docs.map((b) => b.id) } }),
        };
      }),
    )
  )
    .filter((tile) => tile.count >= MIN_TO_SHOW)
    .sort((a, b) => b.count - a.count);

  return {
    featured,
    bodyTypes,
    provinces,
    colours,
    totalLive: total.totalDocs,
    dealershipCount: dealers.totalDocs,
    demonstrationCount: demonstration.totalDocs,
    realLive: total.totalDocs - demonstration.totalDocs,
    realDealershipCount: realDealers.totalDocs,
  };
}

/**
 * The cache, and it belongs on the data rather than on the route.
 *
 * This function issues roughly one count query per body type, per province and per colour,
 * plus a branch lookup per province, which is fine once a minute and wasteful on every
 * request to the most requested page on the site. Caching the DATA keeps the page itself
 * dynamic, which it has to be: a route with `revalidate` on it is prerendered during
 * `next build`, where this database does not exist, and that failed the deploy outright.
 */
export const getHomeData = (featuredLimit = 8): Promise<HomeData> =>
  unstable_cache(() => readHomeData(featuredLimit), ["home-data", String(featuredLimit)], {
    revalidate: 60,
    tags: ["vehicles"],
  })();
