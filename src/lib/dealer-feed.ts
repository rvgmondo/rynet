import type { Payload } from "payload";

import { formatKm, formatRand } from "@/lib/format";
import { populated, relName, relSlug } from "@/lib/relations";
import { vehicleUrl } from "@/lib/urls";
import { pick } from "@/lib/vehicle-photo";
import type { Media, Vehicle } from "@/payload-types";

/**
 * A dealership's live stock as data, for its own website to show.
 *
 * Rynet already keeps a dealership's cars up to date (from its website, a spreadsheet or by hand).
 * This hands the same cars to any other website: their WordPress site, a site Rynet Digital
 * builds, or the one-line embed in src/app/embed/stock.js. One stock list, every screen it is on
 * kept current by itself, which is the whole of Rynet Digital's pitch for stock.
 *
 * WHAT IS IN IT, AND WHAT NEVER IS
 *
 * Only what the public listing on rynet.co.za already shows: the car's name, price, mileage,
 * specification and photographs, and the dealership's public contact details. Never a VIN, a stock
 * number, a cost price or anything a person typed into a private note. Only live cars, and only
 * for a verified dealership that is not an example.
 */

export type FeedPhoto = { url: string; width: number; height: number; alt: string };

export type FeedCar = {
  ref: string;
  title: string;
  year: number | null;
  make: string;
  model: string;
  variant: string | null;
  price: number | null;
  priceLabel: string | null;
  mileageKm: number | null;
  mileageLabel: string | null;
  transmission: string | null;
  fuel: string | null;
  body: string | null;
  colour: string | null;
  photo: FeedPhoto | null;
  photos: FeedPhoto[];
  /** The car on Rynet, where a buyer can enquire. */
  url: string;
  updatedAt: string;
};

export type DealerFeed = {
  dealer: {
    name: string;
    slug: string;
    showroomUrl: string;
    phone: string | null;
    whatsapp: string | null;
    town: string | null;
  };
  count: number;
  cars: FeedCar[];
  generatedAt: string;
};

const absolute = (siteUrl: string, url: string) =>
  /^https?:\/\//i.test(url) ? url : `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;

/** One car, as the feed shows it. Pure, so it can be tested without a database. */
export function feedCar(doc: Vehicle, siteUrl: string): FeedCar {
  const title =
    doc.title ?? [doc.modelYear, relName(doc.make), relName(doc.model)].filter(Boolean).join(" ");
  const photos: FeedPhoto[] = (doc.gallery ?? [])
    .map((row) => {
      const media = populated(row.image as number | Media | null);
      if (!media) return null;
      const big = pick(media, "gallery");
      if (!big) return null;
      return {
        url: absolute(siteUrl, big.url),
        width: big.width,
        height: big.height,
        alt: row.alt?.trim() || media.alt?.trim() || title,
      };
    })
    .filter((photo): photo is FeedPhoto => photo !== null);

  const firstMedia = populated((doc.gallery ?? [])[0]?.image as number | Media | null);
  const card = firstMedia ? pick(firstMedia, "card") : null;

  return {
    ref: (doc.publicRef ?? "").toLowerCase(),
    title,
    year: doc.modelYear ?? null,
    make: relName(doc.make) ?? "",
    model: relName(doc.model) ?? "",
    variant: relName(doc.variant),
    price: doc.price ?? null,
    priceLabel: doc.price ? formatRand(doc.price) : null,
    mileageKm: doc.mileageKm ?? null,
    mileageLabel: typeof doc.mileageKm === "number" ? formatKm(doc.mileageKm) : null,
    transmission: relName(doc.transmission),
    fuel: relName(doc.fuelType),
    body: relName(doc.bodyType),
    colour: relName(doc.exteriorColour),
    photo: card
      ? {
          url: absolute(siteUrl, card.url),
          width: card.width,
          height: card.height,
          alt: photos[0]?.alt ?? title,
        }
      : (photos[0] ?? null),
    photos,
    url: absolute(
      siteUrl,
      vehicleUrl({
        makeSlug: relSlug(doc.make) ?? "",
        modelSlug: relSlug(doc.model) ?? "",
        modelYear: doc.modelYear ?? 0,
        variantName: relName(doc.variant),
        publicRef: doc.publicRef ?? "",
      }),
    ),
    updatedAt: doc.updatedAt,
  };
}

/** The whole feed for one dealership, or null when it has none to show. */
export async function buildDealerFeed(
  payload: Payload,
  slug: string,
  siteUrl: string,
): Promise<DealerFeed | null> {
  const dealers = await payload.find({
    collection: "dealers",
    where: {
      and: [
        { slug: { equals: slug } },
        { verificationStatus: { equals: "verified" } },
        { isDemonstration: { not_equals: true } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const dealer = dealers.docs[0];
  if (!dealer) return null;

  const [cars, branches] = await Promise.all([
    payload.find({
      collection: "vehicles",
      where: { and: [{ dealer: { equals: dealer.id } }, { status: { equals: "live" } }] },
      sort: "-updatedAt",
      limit: 500,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: "branches",
      where: { dealer: { equals: dealer.id } },
      sort: "-isPrimary",
      limit: 1,
      depth: 1,
      overrideAccess: true,
    }),
  ]);

  const branch = branches.docs[0];
  const principal = dealer.principal as { phone?: string | null } | null | undefined;

  return {
    dealer: {
      name: dealer.tradingName,
      slug: dealer.slug,
      showroomUrl: absolute(siteUrl, `/dealers/${dealer.slug}`),
      phone: branch?.phone ?? principal?.phone ?? null,
      whatsapp: (dealer.whatsappNumber as string | null | undefined) ?? branch?.whatsapp ?? null,
      town: branch ? relName(branch.city) : null,
    },
    count: cars.totalDocs,
    cars: (cars.docs as Vehicle[]).map((doc) => feedCar(doc, siteUrl)),
    generatedAt: new Date().toISOString(),
  };
}
