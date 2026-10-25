import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Turning a dealership's photographs into the two files Rynet actually serves.
 *
 * ONE IMAGE AT A TIME, ALWAYS.
 *
 * `images.unoptimized` is true in next.config.ts and stays true. The site is on a shared
 * CloudLinux account with a process limit, and the last time image encoding was allowed to pile up
 * there the account hit that limit and every request after it was answered 503. So nothing here
 * runs in parallel and nothing here runs inside a page request: an import is a command a person
 * runs, it works through one photograph, finishes it, and starts the next.
 *
 * THREE SIZES, MADE ONCE.
 *
 * A 1280px original, a 640px card copy and a 320px thumbnail, all WebP. The thumbnail is what the
 * home page floor lays eighty of at once and what an admin list shows; the card copy standing in
 * for it sent four times the bytes per tile. Otherwise exactly the shape src/seed/demo-photos.ts
 * registers. That shape matters because `pick()` in src/lib/vehicle-photo.ts falls back through
 * the sizes: a results page takes the card copy, and a listing page falls back to the original.
 * Without the card copy a results page would send every buyer the full size original twenty four
 * times over, which is the pile up above by another route.
 *
 * Sharp re-encodes rather than copies, which also strips EXIF, so a photograph taken on a phone on
 * the forecourt does not publish the coordinates of the forecourt.
 */

export const ORIGINAL_WIDTH = 1280;
export const CARD_WIDTH = 640;
export const THUMBNAIL_WIDTH = 320;
export const WEBP_QUALITY = 82;

export type RenderedPhoto = {
  original: { data: Buffer; width: number; height: number };
  card: { data: Buffer; width: number; height: number };
  thumbnail: { data: Buffer; width: number; height: number };
};

/** Photographs per car. Twelve is plenty for a buyer and keeps the file count sane on the host. */
export const MAX_PHOTOS_PER_CAR = 12;

/**
 * One downloaded image, as the two WebP files the site serves.
 *
 * Never enlarged: a small source stays its own size rather than being blown up into a soft
 * pretend original.
 */
export async function renderPhoto(input: Buffer): Promise<RenderedPhoto> {
  const make = async (width: number) => {
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { data: output.data, width: output.info.width, height: output.info.height };
  };

  // Sequential on purpose. See the note above.
  const original = await make(ORIGINAL_WIDTH);
  const card = await make(CARD_WIDTH);
  const thumbnail = await make(THUMBNAIL_WIDTH);
  return { original, card, thumbnail };
}

/** A file name that cannot collide with a dealer's own upload or with another source's. */
/**
 * Whether an image is a banner or a logo rather than a photograph of the car.
 *
 * Dealership galleries sometimes lead with their own sign: Amico's 2017 Ford Focus opened on a
 * 347 by 103 "Multi-Franchise Motor Group" banner, which then became the car's cover in every
 * search result. A photograph of a car is never much wider than 2 to 1, and never under 400
 * pixels wide on a site that sells it; a banner is both. Such an image is skipped, and the next
 * photograph becomes the cover.
 */
export function looksLikeBanner(size: { width: number; height: number }): boolean {
  if (!size.width || !size.height) return false;
  return size.width / size.height > 2.4 || size.width < 400;
}

export function photoFilename(prefix: string, externalId: string, index: number): string {
  const safeId = externalId.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${safeId}-${String(index).padStart(2, "0")}`;
}

/**
 * Alt text a screen reader user can actually use, generated from the car.
 *
 * "2019 Ford Ranger 2.2 XLS, photo 3" rather than a file name. The Media collection refuses to
 * save without alt text, and a dealership should never be asked to type it twenty times per car,
 * so the import writes it the same way src/lib/vehicle-photo.ts would have generated it.
 */
export function photoAlt(carName: string, index: number): string {
  const name = carName.trim() || "Car";
  return `${name}, photo ${index}`;
}

/** The three files onto disk, under the media directory. */
export async function writePhotoFiles(
  staticDir: string,
  baseName: string,
  rendered: RenderedPhoto,
): Promise<{ original: string; card: string; thumbnail: string }> {
  await mkdir(staticDir, { recursive: true });
  const original = `${baseName}.webp`;
  const card = `${baseName}-card.webp`;
  await writeFile(path.join(staticDir, original), rendered.original.data);
  await writeFile(path.join(staticDir, card), rendered.card.data);
  const thumbnail = `${baseName}-thumb.webp`;
  await writeFile(path.join(staticDir, thumbnail), rendered.thumbnail.data);
  return { original, card, thumbnail };
}

/**
 * The media record's own fields, the way demo-photos.ts writes them.
 *
 * Written straight to the database rather than through the upload pipeline, because the upload
 * pipeline would make four more sizes of every photograph. The card copy stands in for the larger
 * renditions through pick(), and the thumbnail is its own file.
 */
export function mediaRecord(options: {
  files: { original: string; card: string; thumbnail: string };
  rendered: RenderedPhoto;
  alt: string;
  dealerId: number;
  folder: string;
  /** Whose photograph it is, shown wherever the library lists it. */
  credit?: string;
}): Record<string, unknown> {
  const { files, rendered, alt, dealerId, folder, credit } = options;
  const cardRendition = {
    url: `/api/media/file/${files.card}`,
    width: rendered.card.width,
    height: rendered.card.height,
    mimeType: "image/webp",
    filesize: rendered.card.data.byteLength,
    filename: files.card,
  };

  return {
    alt,
    ...(credit ? { credit } : {}),
    isDecorative: false,
    isDemonstration: false,
    dealer: dealerId,
    folder,
    filename: files.original,
    mimeType: "image/webp",
    filesize: rendered.original.data.byteLength,
    width: rendered.original.width,
    height: rendered.original.height,
    url: `/api/media/file/${files.original}`,
    focalX: 50,
    focalY: 50,
    sizes: {
      card: cardRendition,
      thumbnail: {
        url: `/api/media/file/${files.thumbnail}`,
        width: rendered.thumbnail.width,
        height: rendered.thumbnail.height,
        mimeType: "image/webp",
        filesize: rendered.thumbnail.data.byteLength,
        filename: files.thumbnail,
      },
    },
  };
}
