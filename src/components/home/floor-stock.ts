import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import type { PhotoCreditLine } from "@/components/home/home-stock";
import { relName, relSlug } from "@/lib/relations";
import { vehicleUrl } from "@/lib/urls";
import { photoCredit, type VehiclePhoto, vehiclePhoto } from "@/lib/vehicle-photo";
import type { Vehicle } from "@/payload-types";

/**
 * The floor: the photographed cars laid out under the home page search.
 *
 * Each tile is a 320px thumbnail, so the whole floor costs about what one large photograph did.
 * Real dealer stock comes first, then demonstration listings, newest first in each, and a
 * photograph already on the floor is not laid twice (the demonstration library reuses Commons
 * photographs across listings of the same model).
 *
 * The tiles only light up and link. Which tiles light, and every count beside them, comes from
 * the search action, which answers from the same rows and the same predicate as /cars.
 */

export type FloorTile = {
  id: number;
  href: string;
  title: string;
  price: number;
  photo: VehiclePhoto;
  demo: boolean;
};

export type Floor = { tiles: FloorTile[]; credits: PhotoCreditLine[] };

/** Enough to fill a wide screen's floor in twelve columns; a phone shows seven rows of eight. */
const TILES = 60;

async function readFloor(): Promise<Floor> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "vehicles",
    where: { status: { equals: "live" } },
    sort: "-publishedAt",
    limit: 400,
    depth: 1,
    select: {
      gallery: true,
      make: true,
      model: true,
      variant: true,
      modelYear: true,
      price: true,
      publicRef: true,
      isDemonstration: true,
    },
  });

  // Only the selected fields are present, which is all vehiclePhoto, photoCredit and the URL read.
  const docs = (found.docs as unknown as Vehicle[]).sort(
    (a, b) => Number(Boolean(a.isDemonstration)) - Number(Boolean(b.isDemonstration)),
  );

  const seen = new Set<string>();
  const tiles: FloorTile[] = [];
  const credits = new Map<string, PhotoCreditLine>();

  for (const doc of docs) {
    if (tiles.length >= TILES) break;
    const photo = vehiclePhoto(doc, "thumbnail");
    if (!photo || seen.has(photo.url) || !doc.publicRef) continue;
    seen.add(photo.url);

    const makeName = relName(doc.make) ?? "";
    const modelName = relName(doc.model) ?? "";
    tiles.push({
      id: doc.id,
      href: vehicleUrl({
        makeSlug: relSlug(doc.make) ?? "",
        modelSlug: relSlug(doc.model) ?? "",
        modelYear: doc.modelYear,
        variantName: relName(doc.variant),
        publicRef: doc.publicRef,
      }),
      title: [doc.modelYear, makeName, modelName].filter(Boolean).join(" "),
      price: doc.price,
      photo,
      demo: Boolean(doc.isDemonstration),
    });

    const line = photoCredit(doc);
    if (line) {
      const subject = [makeName, modelName].filter(Boolean).join(" ") || "Vehicle";
      credits.set(`${subject}|${line}`, { subject, credit: line });
    }
  }

  return { tiles, credits: [...credits.values()] };
}

export const getFloor = unstable_cache(readFloor, ["home-floor"], {
  revalidate: 60,
  tags: ["vehicles"],
});
