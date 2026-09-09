import config from "@payload-config";
import { getPayload } from "payload";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { toCard } from "@/lib/search";

/**
 * What the home page needs to be a marketplace rather than a brochure.
 *
 * The home page fetched nothing at all and showed no cars, which is the single biggest reason
 * it read as cheap: a marketplace whose front page has nothing to buy is a leaflet. Everything
 * here is deliberately cheap to compute, because this is the most requested page on the site
 * and it renders on demand against SQLite.
 */

export type BrowseTile = {
  slug: string;
  name: string;
  count: number;
};

export type HomeData = {
  featured: VehicleCardData[];
  bodyTypes: BrowseTile[];
  provinces: BrowseTile[];
  totalLive: number;
  dealershipCount: number;
};

const MIN_TO_SHOW = 1;

/**
 * Featured stock, spread across dealerships.
 *
 * One dealership uploading forty cars in an afternoon would otherwise own the entire front
 * page, which is both ugly and unfair to everyone else. So this takes the newest listings and
 * keeps at most two from any one dealership.
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

export async function getHomeData(featuredLimit = 8): Promise<HomeData> {
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

  const [bodyDocs, provinceDocs, total, dealers] = await Promise.all([
    payload.find({
      collection: "body-types",
      where: { isActive: { equals: true } },
      limit: 30,
      depth: 0,
    }),
    payload.find({ collection: "provinces", limit: 20, depth: 0, sort: "name" }),
    payload.count({ collection: "vehicles", where: live }),
    payload.count({ collection: "dealers", where: { verificationStatus: { equals: "verified" } } }),
  ]);

  // Counted rather than assumed. A browse tile promising SUVs and landing on an empty result
  // is worse than not offering the tile, and the counts are the reason to click.
  const bodyTypes = (
    await Promise.all(
      bodyDocs.docs.map(async (body) => ({
        slug: body.slug,
        name: body.name,
        count: (
          await payload.count({
            collection: "vehicles",
            where: { and: [live, { bodyType: { equals: body.id } }] },
          })
        ).totalDocs,
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

        const count = await payload.count({
          collection: "vehicles",
          where: { and: [live, { branch: { in: branches.docs.map((b) => b.id) } }] },
        });
        return { slug: province.slug, name: province.name, count: count.totalDocs };
      }),
    )
  )
    .filter((tile) => tile.count >= MIN_TO_SHOW)
    .sort((a, b) => b.count - a.count);

  return {
    featured,
    bodyTypes,
    provinces,
    totalLive: total.totalDocs,
    dealershipCount: dealers.totalDocs,
  };
}
