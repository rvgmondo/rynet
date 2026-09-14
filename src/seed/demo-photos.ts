import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

import type { Payload, PayloadRequest } from "payload";

import { assignPhotos, type ListingForPhoto, type PhotoOption } from "./photo-assignment";
import manifest from "./photos/manifest.json";

/**
 * Put the demonstration photographs onto the demonstration stock.
 *
 * WHY THIS IS SHARED CODE AND NOT A SEED SCRIPT
 *
 * It used to be only a seed script, run by hand with tsx. The live host has neither tsx nor a
 * terminal anyone uses, so the photographs existed on every development machine and never once
 * on the site the owner looks at. Now the same function runs from two places: the command line
 * locally (src/seed/attach-photos.ts), and a database migration that the live app applies to
 * itself at boot. One implementation, so the two cannot drift.
 *
 * WHY IT DOES NOT PROCESS UPLOADS
 *
 * A normal upload goes through sharp to make derivatives. Doing that for 134 photographs inside
 * a migration, at boot, on a shared CloudLinux account, is how a deploy times out its own health
 * check. The committed photographs are already sized (scripts/demo-photos/build-manifest.mjs)
 * and the manifest carries their dimensions, so this copies the files and writes the media
 * rows directly. next/image resizes for the viewport on every page regardless.
 *
 * WHAT IS AND IS NOT CLAIMED
 *
 * Each photograph is a real photograph of the current shape of the model it is attached to,
 * from Wikimedia Commons under a licence allowing commercial use, credited on the page. It is
 * not a photograph of that listing's car, because that car does not exist, and the listing
 * page says exactly that under the image.
 *
 * WHEN IT REFUSES
 *
 * If a single listing on the platform is not a demonstration listing, it does nothing at all.
 * Real stock and illustration must never be mixed, and the day the first real dealership lists
 * is the day the illustration should be removed, not topped up.
 */

export type ManifestEntry = {
  make: string;
  model: string;
  colour: string | null;
  file: string;
  width: number;
  height: number;
  filesize: number;
  title: string;
  licence: string;
  author: string;
  source: string;
};

export type InstallResult =
  | { installed: true; photographs: number; listings: number; bare: number }
  | { installed: false; reason: string };

/** Media filenames carry a prefix, so they can never collide with a dealer's own upload. */
export const DEMO_PREFIX = "demo-";

/**
 * One listing in twelve keeps no photograph, deliberately.
 *
 * A dealership lists stock before it photographs it, so a real feed always arrives with some
 * listings bare, and the site has to be seen handling that. The id rather than a random number,
 * so the same listings are bare on every machine.
 */
export function leftBare(vehicleId: number): boolean {
  return vehicleId % 12 === 0;
}

const photosDir = () => path.join(process.cwd(), "src", "seed", "photos");

type Relation = number | { id: number } | null | undefined;
const idOf = (value: Relation): number | null =>
  value === null || value === undefined ? null : typeof value === "object" ? value.id : value;

export async function installDemoPhotos(
  payload: Payload,
  options: { req?: Partial<PayloadRequest>; log?: (message: string) => void } = {},
): Promise<InstallResult> {
  const { req } = options;
  const log = options.log ?? ((message: string) => payload.logger.info(message));
  const entries = manifest as ManifestEntry[];

  const upload = payload.collections.media?.config.upload;
  if (!upload || typeof upload !== "object") {
    return { installed: false, reason: "the media collection has no upload configuration" };
  }
  if (upload.disableLocalStorage) {
    // Cloud storage is configured, so a file copied to local disk would never be served.
    return {
      installed: false,
      reason:
        "media is stored in the cloud bucket, not on this disk, so local files cannot be used",
    };
  }

  const vehicles = await payload.find({
    collection: "vehicles",
    limit: 0,
    pagination: false,
    depth: 0,
    sort: "-publishedAt",
    overrideAccess: true,
    req,
  });
  if (vehicles.docs.length === 0) {
    return { installed: false, reason: "there is no stock yet" };
  }
  const real = vehicles.docs.filter(
    (doc) => !(doc as { isDemonstration?: boolean }).isDemonstration,
  );
  if (real.length > 0) {
    return {
      installed: false,
      reason: `${real.length} listings are real stock, and illustration is never mixed with real stock`,
    };
  }

  const existing = await payload.count({
    collection: "media",
    where: { isDemonstration: { equals: true } },
    overrideAccess: true,
    req,
  });
  if (existing.totalDocs > 0) {
    return {
      installed: false,
      reason: `${existing.totalDocs} demonstration photographs are already installed`,
    };
  }

  // ------------------------------------------------------------------ files, then media rows

  const staticDir = path.resolve(process.cwd(), upload.staticDir ?? "media");
  await mkdir(staticDir, { recursive: true });

  const mediaIdByFile = new Map<string, number>();
  for (const entry of entries) {
    const filename = `${DEMO_PREFIX}${entry.file}`;
    const target = path.join(staticDir, filename);
    const already = await stat(target).catch(() => null);
    if (!already) await copyFile(path.join(photosDir(), entry.file), target);

    const created = await payload.db.create({
      collection: "media",
      data: {
        alt: `${entry.make} ${entry.model}`,
        isDecorative: false,
        // The credit line the licence obliges, on the record, so whatever renders the image can
        // render the attribution beside it.
        credit: `${entry.author}, ${entry.licence}, via Wikimedia Commons`,
        isDemonstration: true,
        folder: "demonstration",
        filename,
        mimeType: "image/webp",
        filesize: entry.filesize,
        width: entry.width,
        height: entry.height,
        url: `/api/media/file/${filename}`,
        focalX: 50,
        focalY: 50,
      },
      req,
    });
    mediaIdByFile.set(entry.file, created.id as number);
  }
  log(`registered ${entries.length} demonstration photographs`);

  // ------------------------------------------------------------------ which listing gets which

  const all = (collection: "makes" | "models" | "colours") =>
    payload.find({ collection, limit: 0, pagination: false, depth: 0, overrideAccess: true, req });
  const [makes, models, colours] = await Promise.all([all("makes"), all("models"), all("colours")]);
  const nameOf = (docs: { id: unknown; name?: unknown }[]) =>
    new Map(docs.map((doc) => [doc.id as number, String(doc.name ?? "")]));
  const makeName = nameOf(makes.docs as never);
  const modelName = nameOf(models.docs as never);
  const colourFamily = new Map(
    (colours.docs as { id: number; family?: string | null }[]).map((doc) => [
      doc.id,
      doc.family ?? null,
    ]),
  );

  const photosByModel = new Map<string, (PhotoOption & { entry: ManifestEntry })[]>();
  for (const entry of entries) {
    const key = `${entry.make}|${entry.model}`;
    const list = photosByModel.get(key) ?? [];
    list.push({ id: entry.file, colour: entry.colour, entry });
    photosByModel.set(key, list);
  }

  type Vehicle = {
    id: number;
    publicRef?: string | null;
    dealer?: Relation;
    make?: Relation;
    model?: Relation;
    exteriorColour?: Relation;
  };
  const listingsByModel = new Map<string, (ListingForPhoto & { vehicle: Vehicle })[]>();
  let bare = 0;
  for (const vehicle of vehicles.docs as Vehicle[]) {
    if (leftBare(vehicle.id)) {
      bare += 1;
      continue;
    }
    const key = `${makeName.get(idOf(vehicle.make) ?? -1)}|${modelName.get(idOf(vehicle.model) ?? -1)}`;
    const list = listingsByModel.get(key) ?? [];
    list.push({
      id: vehicle.id,
      publicRef: vehicle.publicRef ?? String(vehicle.id),
      dealerId: idOf(vehicle.dealer),
      colourFamily: colourFamily.get(idOf(vehicle.exteriorColour) ?? -1) ?? null,
      vehicle,
    });
    listingsByModel.set(key, list);
  }

  let listings = 0;
  for (const [key, list] of listingsByModel) {
    const photos = photosByModel.get(key);
    if (!photos) {
      bare += list.length;
      continue;
    }
    const chosen = assignPhotos(list, photos);
    for (const listing of list) {
      const file = chosen.get(listing.id);
      const mediaId = file ? mediaIdByFile.get(file) : undefined;
      if (!file || mediaId === undefined) continue;
      const entry = photos.find((photo) => photo.id === file)?.entry;
      await payload.update({
        collection: "vehicles",
        id: listing.id,
        data: { gallery: [{ image: mediaId, alt: entry ? `${entry.make} ${entry.model}` : null }] },
        overrideAccess: true,
        // Every seeded dealership is verified, so the live-stock check in beforeChange passes
        // on its own merits rather than being bypassed.
        req,
      });
      listings += 1;
    }
  }

  log(`photographed ${listings} listings, ${bare} left without a photograph`);
  return { installed: true, photographs: entries.length, listings, bare };
}

/** Takes it all back out: galleries first, so no listing is left pointing at a deleted row. */
export async function removeDemoPhotos(
  payload: Payload,
  options: { req?: Partial<PayloadRequest> } = {},
): Promise<number> {
  const { req } = options;
  const media = await payload.find({
    collection: "media",
    where: { isDemonstration: { equals: true } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const ids = new Set(media.docs.map((doc) => doc.id as number));
  if (ids.size === 0) return 0;

  const vehicles = await payload.find({
    collection: "vehicles",
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  });
  for (const vehicle of vehicles.docs as {
    id: number;
    gallery?: { image?: Relation }[] | null;
  }[]) {
    const gallery = vehicle.gallery ?? [];
    if (!gallery.some((row) => ids.has(idOf(row.image) ?? -1))) continue;
    await payload.update({
      collection: "vehicles",
      id: vehicle.id,
      data: { gallery: gallery.filter((row) => !ids.has(idOf(row.image) ?? -1)) as never },
      overrideAccess: true,
      req,
    });
  }

  for (const id of ids) {
    await payload.delete({ collection: "media", id, overrideAccess: true, req });
  }
  return ids.size;
}
