import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { formatRand } from "@/lib/format";
import { relId, relName } from "@/lib/relations";
import { toCard } from "@/lib/search";
import { vehicleUrl } from "@/lib/urls";
import { photoCredit, type VehiclePhoto, vehiclePhoto } from "@/lib/vehicle-photo";
import type { Vehicle } from "@/payload-types";

/**
 * What the SHOWROOM home page needs beyond the counts in src/lib/home-data.ts.
 *
 * The home page leads with a photograph, a search with real make and model lists, photo tiles
 * per body type and a row of photographed cars. None of that is in getHomeData, and that file
 * belongs to the shared library, so the surface keeps its own loader here. It returns card data
 * only, never a document, so nothing a card does not draw (the VIN above all) reaches the cache
 * or the page.
 *
 * Everything is a live query, cached for a minute and dropped on any stock or taxonomy write.
 */

export type HeroListing = {
  card: VehicleCardData;
  href: string;
  /** The "gallery" rendition: the listing hero size, not the 640px card copy. */
  photo: VehiclePhoto;
  /**
   * The 640px "card" copy of the same photograph, offered to phones through srcset. On a throttled
   * phone the 1280px file alone took the home page's largest paint past two seconds.
   */
  small: VehiclePhoto | null;
  credit: string | null;
};

export type BodyTypeTile = {
  slug: string;
  name: string;
  count: number;
  photo: VehiclePhoto | null;
};

export type StockOption = { slug: string; name: string; count: number };
export type ModelOption = StockOption & { makeSlug: string };
export type PriceOption = { value: number; label: string };
export type PhotoCreditLine = { subject: string; credit: string };

export type HomeStock = {
  hero: HeroListing | null;
  featured: VehicleCardData[];
  bodyTypes: BodyTypeTile[];
  /** Alphabetical, for the select. */
  makes: StockOption[];
  models: ModelOption[];
  prices: PriceOption[];
  /** Every Commons photograph the page shows, so the attribution the licence asks for is on it. */
  credits: PhotoCreditLine[];
};

const LIVE = { status: { equals: "live" } } as const;

/** Price ceilings a buyer actually picks from. Trimmed to the range the stock covers. */
const CEILINGS = [
  100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 1_500_000,
  2_000_000, 3_000_000,
];

function priceOptions(min: number, max: number): PriceOption[] {
  const out: PriceOption[] = [];
  for (const ceiling of CEILINGS) {
    if (ceiling <= min) continue;
    out.push({ value: ceiling, label: `Up to ${formatRand(ceiling)}` });
    if (ceiling >= max) break;
  }
  return out;
}

/**
 * Photographs clean enough to open the site on, in order of preference: the whole car, a plain
 * or showroom ground, and no other company's banners or crowds behind it. Chosen by eye from the
 * demonstration library's contact sheet. The hero is the newest live listing that leads with one
 * of these; with none live it falls back to the newest landscape photograph, as before. When
 * dealerships upload their own studio photography this list stops mattering.
 */
const HERO_PHOTOS = [
  "demo-toyota-hilux--2.webp",
  "demo-toyota-hilux--3.webp",
  "demo-haval-h6--2.webp",
  "demo-mahindra-xuv700--2.webp",
  "demo-bmw-3-series--3.webp",
];

/**
 * The same judgement for the body type tiles, which are the other large photographs on the home
 * page: plain, studio or showroom grounds first. A tile takes the first of these its body type has
 * live and not already on the page, and otherwise falls back to the newest photographed listing.
 */
const TILE_PHOTOS = [
  "demo-mahindra-xuv700--2.webp",
  "demo-haval-h6--2.webp",
  "demo-kia-sonet--3.webp",
  "demo-nissan-magnite--3.webp",
  "demo-hyundai-i20--3.webp",
  "demo-mercedes-benz-a-class--1.webp",
  "demo-suzuki-swift--1.webp",
  "demo-volkswagen-amarok--1.webp",
  "demo-toyota-hilux--3.webp",
  "demo-ford-ranger--2.webp",
  "demo-bmw-3-series--2.webp",
  "demo-mercedes-benz-c-class--1.webp",
];

/** A photograph wide enough to crop to the hero's 16:9 without losing the car. */
const isLandscape = (photo: VehiclePhoto) => photo.width / photo.height >= 1.45;

function subjectOf(doc: Vehicle): string {
  return [relName(doc.make), relName(doc.model)].filter(Boolean).join(" ") || "Vehicle";
}

/**
 * The newest cars, photographs first, then a photograph not already on the page, and never more
 * than two from one dealership.
 *
 * The demonstration library reuses Commons photographs across listings of the same model, so a
 * row that took the newest eight could show the same Hilux three times. Three passes keep it
 * varied: unseen photographs, then repeated ones, then listings with no photograph at all.
 */
function pickFeatured(docs: Vehicle[], used: Set<string>, limit: number, perDealer = 2) {
  const perDealerCount = new Map<string, number>();
  const chosen: Vehicle[] = [];
  const taken = new Set<number>();

  const passes: ((doc: Vehicle) => boolean)[] = [
    (doc) => {
      const photo = vehiclePhoto(doc, "card");
      return Boolean(photo && !used.has(photo.url));
    },
    (doc) => Boolean(vehiclePhoto(doc, "card")),
    () => true,
  ];

  for (const accept of passes) {
    for (const doc of docs) {
      if (chosen.length >= limit) return chosen;
      if (taken.has(doc.id) || !accept(doc)) continue;

      const dealer = String(relId(doc.dealer) ?? "");
      const count = perDealerCount.get(dealer) ?? 0;
      if (count >= perDealer) continue;

      perDealerCount.set(dealer, count + 1);
      taken.add(doc.id);
      chosen.push(doc);
      const photo = vehiclePhoto(doc, "card");
      if (photo) used.add(photo.url);
    }
  }
  return chosen;
}

const firstFilename = (doc: Vehicle): string | null => {
  const image = doc.gallery?.[0]?.image;
  return image && typeof image === "object" ? (image.filename ?? null) : null;
};

type Payload = Awaited<ReturnType<typeof getPayload>>;

/**
 * Live listings that LEAD with one of `files`, ordered by that list (then newest first), so the
 * caller can take the first that suits it. Any failure returns nothing: a preference is never a
 * reason for the home page to fail.
 */
async function leadingWith(
  payload: Payload,
  files: readonly string[],
  query: { depth: number; select?: Record<string, true> },
): Promise<Vehicle[]> {
  try {
    const media = await payload.find({
      collection: "media",
      where: { filename: { in: [...files] } },
      depth: 0,
      pagination: false,
      select: { filename: true },
    });
    if (media.docs.length === 0) return [];
    const found = await payload.find({
      collection: "vehicles",
      where: { and: [LIVE, { "gallery.image": { in: media.docs.map((m) => m.id) } }] },
      sort: "-publishedAt",
      limit: 100,
      depth: query.depth,
      ...(query.select ? { select: query.select } : {}),
    });
    const docs = (found.docs as unknown as Vehicle[]).filter((doc) => {
      const file = firstFilename(doc);
      return file !== null && files.includes(file);
    });
    return docs.sort(
      (a, b) =>
        files.indexOf(firstFilename(a) as string) - files.indexOf(firstFilename(b) as string),
    );
  } catch {
    return [];
  }
}

async function cleanHero(payload: Payload): Promise<Vehicle | null> {
  const docs = await leadingWith(payload, HERO_PHOTOS, { depth: 2 });
  return docs.find((doc) => vehiclePhoto(doc, "gallery") !== null) ?? null;
}

async function readHomeStock(): Promise<HomeStock> {
  const payload = await getPayload({ config });

  // One light pass over live stock for the make, model and body type lists and the price range.
  const [stock, recent] = await Promise.all([
    payload.find({
      collection: "vehicles",
      where: LIVE,
      depth: 0,
      pagination: false,
      select: { make: true, model: true, bodyType: true, price: true },
    }),
    payload.find({
      collection: "vehicles",
      where: LIVE,
      sort: "-publishedAt",
      limit: 48,
      depth: 2,
    }),
  ]);

  const tally = (key: "make" | "model" | "bodyType") => {
    const counts = new Map<number, number>();
    for (const doc of stock.docs) {
      const id = relId(doc[key]);
      if (id !== null) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  };

  const makeCounts = tally("make");
  const modelCounts = tally("model");
  const bodyCounts = tally("bodyType");

  const prices = stock.docs.map((doc) => doc.price).filter((p) => typeof p === "number" && p > 0);

  const [makeDocs, modelDocs, bodyDocs] = await Promise.all([
    makeCounts.size
      ? payload.find({
          collection: "makes",
          where: { id: { in: [...makeCounts.keys()] } },
          depth: 0,
          pagination: false,
        })
      : null,
    modelCounts.size
      ? payload.find({
          collection: "models",
          where: { id: { in: [...modelCounts.keys()] } },
          depth: 0,
          pagination: false,
        })
      : null,
    bodyCounts.size
      ? payload.find({
          collection: "body-types",
          where: { id: { in: [...bodyCounts.keys()] } },
          depth: 0,
          pagination: false,
        })
      : null,
  ]);

  const makes: StockOption[] = (makeDocs?.docs ?? [])
    .map((make) => ({ slug: make.slug, name: make.name, count: makeCounts.get(make.id) ?? 0 }))
    .filter((make) => make.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "en-ZA"));

  const makeSlugById = new Map((makeDocs?.docs ?? []).map((make) => [make.id, make.slug]));

  const models: ModelOption[] = (modelDocs?.docs ?? [])
    .map((model) => ({
      slug: model.slug,
      name: model.name,
      makeSlug: makeSlugById.get(relId(model.make) ?? -1) ?? "",
      count: modelCounts.get(model.id) ?? 0,
    }))
    .filter((model) => model.count > 0 && model.makeSlug)
    .sort((a, b) => a.name.localeCompare(b.name, "en-ZA"));

  // The hero: the newest listing that leads with one of the clean photographs, else the newest
  // photographed listing whose photograph is wide enough to crop well.
  const docs = recent.docs;
  const heroDoc =
    (await cleanHero(payload)) ??
    docs.find((doc) => {
      const photo = vehiclePhoto(doc, "gallery");
      return photo ? isLandscape(photo) : false;
    }) ??
    docs.find((doc) => vehiclePhoto(doc, "gallery"));

  const used = new Set<string>();
  const credits = new Map<string, PhotoCreditLine>();
  const credit = (doc: Vehicle) => {
    const line = photoCredit(doc);
    if (!line) return;
    const subject = subjectOf(doc);
    credits.set(`${subject}|${line}`, { subject, credit: line });
  };

  let hero: HeroListing | null = null;
  if (heroDoc) {
    const photo = vehiclePhoto(heroDoc, "gallery");
    const card = toCard(heroDoc);
    if (photo) {
      const cardPhoto = vehiclePhoto(heroDoc, "card");
      hero = {
        card,
        href: vehicleUrl(card),
        photo,
        small: cardPhoto && cardPhoto.url !== photo.url ? cardPhoto : null,
        credit: photoCredit(heroDoc),
      };
      used.add(photo.url);
      if (cardPhoto) used.add(cardPhoto.url);
      credit(heroDoc);
    }
  }

  const featuredDocs = pickFeatured(
    docs.filter((doc) => doc.id !== heroDoc?.id),
    used,
    8,
  );
  for (const doc of featuredDocs) if (vehiclePhoto(doc, "card")) credit(doc);

  /*
   * Body type tiles, biggest first, each with a photographed listing of that body type.
   *
   * One small query per body type, in turn rather than all at once, so the biggest type gets
   * first pick of the photographs not already on the page and the tiles come out the same on
   * every render. There are a handful of body types and the whole loader is cached.
   */
  const bodyOrder = (bodyDocs?.docs ?? [])
    .map((body) => ({ body, count: bodyCounts.get(body.id) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.body.name.localeCompare(b.body.name, "en-ZA"));

  const cleanTiles = await leadingWith(payload, TILE_PHOTOS, {
    depth: 1,
    select: {
      gallery: true,
      make: true,
      model: true,
      modelYear: true,
      variant: true,
      bodyType: true,
    },
  });

  const bodyTypes: BodyTypeTile[] = [];
  for (const { body, count } of bodyOrder) {
    const clean = cleanTiles.find((doc) => {
      const photo = vehiclePhoto(doc, "card");
      return relId(doc.bodyType) === body.id && photo !== null && !used.has(photo.url);
    });
    if (clean) {
      const photo = vehiclePhoto(clean, "card");
      if (photo) {
        used.add(photo.url);
        credit(clean);
        bodyTypes.push({ slug: body.slug, name: body.name, count, photo });
        continue;
      }
    }

    const found = await payload.find({
      collection: "vehicles",
      where: { and: [LIVE, { bodyType: { equals: body.id } }] },
      sort: "-publishedAt",
      limit: 24,
      depth: 1,
      select: { gallery: true, make: true, model: true, modelYear: true, variant: true },
    });
    // Only the selected fields are present, which is all vehiclePhoto and photoCredit read.
    const withPhoto = (found.docs as unknown as Vehicle[]).filter((doc) =>
      vehiclePhoto(doc, "card"),
    );
    const pick =
      withPhoto.find((doc) => !used.has(vehiclePhoto(doc, "card")?.url ?? "")) ?? withPhoto[0];
    const photo = pick ? vehiclePhoto(pick, "card") : null;
    if (pick && photo) {
      used.add(photo.url);
      credit(pick);
    }
    bodyTypes.push({ slug: body.slug, name: body.name, count, photo });
  }

  return {
    hero,
    featured: featuredDocs.map(toCard),
    bodyTypes,
    makes,
    models,
    prices: prices.length ? priceOptions(Math.min(...prices), Math.max(...prices)) : [],
    credits: [...credits.values()].sort((a, b) => a.subject.localeCompare(b.subject, "en-ZA")),
  };
}

export const getHomeStock = unstable_cache(readHomeStock, ["home-stock"], {
  revalidate: 60,
  tags: ["vehicles", "taxonomy"],
});
