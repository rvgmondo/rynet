import { populated, relName } from "@/lib/relations";
import type { Media, Vehicle } from "@/payload-types";

/**
 * The photograph a listing leads with.
 *
 * THE DESIGN WAS BUILT AROUND NOT HAVING ONE, AND THAT WAS THE MISTAKE.
 *
 * Every competitor in this market is built on photographs: Cars.co.za, AutoTrader, Carwow and
 * the rest all put a photograph at the top of the page and another on every card, and it is the
 * thing a buyer scans. Rynet had a generated colour field in that position on every surface,
 * because the seeded stock has no photographs, and the result read as a car site with no cars in
 * it. Good typography does not fix a missing subject.
 *
 * The colour plate was always meant to be the answer to "this listing has no photograph". It
 * still is, and it is a better answer than the grey rectangle with a camera glyph that every
 * other site shows. It just stops being the identity of the platform.
 *
 * WHAT THIS RETURNS
 *
 * The first gallery image at the size the caller asked for, or null. `card` for a result grid,
 * `gallery` for the listing page, `hero` where something is full width. Falling back through the
 * sizes rather than assuming one exists, because a derivative can be missing on an image that
 * was uploaded before a size was added to the collection.
 */

export type VehiclePhoto = {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** How many photographs the listing has, which is a signal in itself. */
  count: number;
};

type Size = "thumbnail" | "card" | "gallery" | "hero";

/** The order to fall back through, per requested size, largest-first after the ask. */
const FALLBACK: Record<Size, Size[]> = {
  thumbnail: ["thumbnail", "card", "gallery", "hero"],
  card: ["card", "gallery", "hero", "thumbnail"],
  gallery: ["gallery", "hero", "card", "thumbnail"],
  hero: ["hero", "gallery", "card", "thumbnail"],
};

/**
 * Same-origin media becomes a PATH, not an absolute URL.
 *
 * Payload stamps every upload URL with `serverURL`, so a local media file arrives as
 * `http://localhost:3000/api/media/file/x.webp`. That is wrong on any origin except the one
 * the config names: it broke every image on the production build served from port 3210, and it
 * would break a staging domain the same way.
 *
 * A path is correct on all of them. R2 media is left alone, because it genuinely lives on
 * another host, and it never carries the `/api/media/` prefix that Payload's own file route
 * does.
 */
function samePath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/api/media/") ? parsed.pathname + parsed.search : url;
  } catch {
    // Already relative.
    return url;
  }
}

function pick(media: Media, size: Size): { url: string; width: number; height: number } | null {
  const sizes = media.sizes as
    | Record<string, { url?: string | null; width?: number | null; height?: number | null }>
    | undefined;

  for (const candidate of FALLBACK[size]) {
    const derivative = sizes?.[candidate];
    if (derivative?.url && derivative.width && derivative.height) {
      return { url: samePath(derivative.url), width: derivative.width, height: derivative.height };
    }
  }

  // The original, which always exists on an upload that succeeded.
  if (media.url && media.width && media.height) {
    return { url: samePath(media.url), width: media.width, height: media.height };
  }
  return null;
}

/**
 * Alt text, from the photo, or generated from the car.
 *
 * The Media collection refuses to save without alt text, so this is a fallback for the gallery
 * row's own override rather than for a missing one. Generated text still beats a filename: "2023
 * Toyota Hilux Raider, Titanium Grey" is what a screen reader user needs, and it is the same
 * sentence the collection generates for a dealer who leaves the field alone.
 */
function altFor(vehicle: Vehicle, rowAlt: string | null, media: Media | null): string {
  if (rowAlt?.trim()) return rowAlt.trim();
  if (media?.alt?.trim()) return media.alt.trim();

  const parts = [
    vehicle.modelYear,
    relName(vehicle.make),
    relName(vehicle.model),
    relName(vehicle.variant),
  ].filter(Boolean);
  const colour = relName(vehicle.exteriorColour);

  return `${parts.join(" ")}${colour ? `, ${colour}` : ""}`.trim() || "Vehicle photograph";
}

export function vehiclePhoto(vehicle: Vehicle, size: Size = "card"): VehiclePhoto | null {
  const gallery = vehicle.gallery ?? [];
  if (gallery.length === 0) return null;

  const first = gallery[0];
  if (!first) return null;

  const media = populated(first.image as number | Media | null);
  if (!media) return null;

  const chosen = pick(media, size);
  if (!chosen) return null;

  return {
    url: chosen.url,
    alt: altFor(vehicle, first.alt ?? null, media),
    width: chosen.width,
    height: chosen.height,
    count: gallery.length,
  };
}

/**
 * The credit line a CC BY-SA photograph owes its photographer.
 *
 * The seeded stock is illustrated with photographs from Wikimedia Commons, which are real
 * photographs of the real model, licensed for commercial use and requiring attribution. The
 * obligation is met where the photo is shown rather than on a page nobody opens, so this reads
 * the media record's own `credit` field and the listing page prints it under the image.
 *
 * Real dealer photography carries no credit, so this returns null and nothing is drawn.
 */
export function photoCredit(vehicle: Vehicle): string | null {
  const first = (vehicle.gallery ?? [])[0];
  if (!first) return null;
  const media = populated(first.image as number | Media | null);
  const credit = media?.credit;
  return typeof credit === "string" && credit.trim() ? credit.trim() : null;
}
