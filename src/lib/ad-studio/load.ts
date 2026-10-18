import type { Payload } from "payload";

import type { AdCar, AdDealer } from "@/lib/ad-studio/caption";
import { vehicleUrl } from "@/lib/urls";
import { pick } from "@/lib/vehicle-photo";
import type { Media, User } from "@/payload-types";

/**
 * Everything the Ad studio draws from, for one dealership: its name, logo and town, and its live
 * cars that have a photograph.
 *
 * Shared by the staff screen (admin > Ad studio) and the dealership's own (/portal/ads). Staff
 * read as staff; a dealership reads as itself, through the same access rules as everything else
 * it does, which is the `as` argument.
 */

export type AdStudioData = { dealer: AdDealer; cars: AdCar[]; totalLive: number };

type ReadAs = { overrideAccess: true } | { user: User; overrideAccess: false };

const nameOf = (value: unknown): string | null =>
  value && typeof value === "object" && "name" in value
    ? String((value as { name?: unknown }).name ?? "") || null
    : null;

export async function loadAdStudio(
  payload: Payload,
  dealerId: number,
  siteUrl: string,
  as: ReadAs,
): Promise<AdStudioData | null> {
  const dealerDoc = (await payload
    .findByID({ collection: "dealers", id: dealerId, depth: 1, ...as })
    .catch(() => null)) as Record<string, unknown> | null;
  if (!dealerDoc) return null;

  const branch = await payload.find({
    collection: "branches",
    where: { dealer: { equals: dealerId } },
    sort: "-isPrimary",
    limit: 1,
    depth: 1,
    ...as,
  });
  const town = nameOf((branch.docs[0] as Record<string, unknown> | undefined)?.city);

  const logo = dealerDoc.logo as Media | number | null | undefined;
  const logoUrl = logo && typeof logo === "object" ? (pick(logo, "card")?.url ?? null) : null;
  const slug = String(dealerDoc.slug ?? "");
  const dealer: AdDealer = {
    tradingName: String(dealerDoc.tradingName ?? ""),
    logoUrl,
    showroomUrl: `${siteUrl}/dealers/${slug}`,
    town,
  };

  const vehicles = await payload.find({
    collection: "vehicles",
    where: { and: [{ dealer: { equals: dealerId } }, { status: { equals: "live" } }] },
    sort: "-updatedAt",
    limit: 200,
    depth: 1,
    ...as,
  });

  const cars: AdCar[] = (vehicles.docs as unknown as Record<string, unknown>[])
    .map((doc) => {
      const gallery = (doc.gallery as { image?: Media | number | null }[] | null) ?? [];
      const photos = gallery
        .map((row) =>
          row.image && typeof row.image === "object" ? pick(row.image, "gallery")?.url : null,
        )
        .filter((url): url is string => Boolean(url))
        .slice(0, 3);
      const make = doc.make as { slug?: string } | null;
      const model = doc.model as { slug?: string } | null;
      return {
        id: doc.id as number,
        title: String(doc.title ?? ""),
        year: (doc.modelYear as number | null) ?? null,
        price: (doc.price as number | null) ?? null,
        mileageKm: (doc.mileageKm as number | null) ?? null,
        transmission: nameOf(doc.transmission),
        town,
        url: `${siteUrl}${vehicleUrl({
          makeSlug: make?.slug ?? "",
          modelSlug: model?.slug ?? "",
          modelYear: (doc.modelYear as number | null) ?? 0,
          variantName: nameOf(doc.variant),
          publicRef: String(doc.publicRef ?? ""),
        })}`,
        photos,
      };
    })
    .filter((car) => car.photos.length > 0);

  return { dealer, cars, totalLive: vehicles.totalDocs };
}
