import { createPoliteFetcher, type PoliteFetcher } from "./fetch";
import {
  listingUrlsFromSitemap,
  looksLikeMotorsListing,
  motorsSitemap,
  parseMotorsListing,
  siteOrigin,
  sourceKey,
} from "./motors";

/**
 * "Can Rynet read this dealership's website?", answered before anyone promises them it can.
 *
 * Reads the site's listing sitemap and one listing, and says what it found in words a person can
 * repeat to the dealership: how many cars, and what the first one looks like once read. Two
 * requests at most beyond the sitemap, so checking a site is never a burden on it.
 */

/** Sites whose listings Rynet must never copy, whoever asks. */
const PORTALS = [
  "autotrader.co.za",
  "cars.co.za",
  "gumtree.co.za",
  "webuycars.co.za",
  "carfind.co.za",
  "olx.co.za",
  "surf4cars.co.za",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "carmag.co.za",
  "autodealer.co.za",
  "ananzi.co.za",
] as const;

/** The portal an address belongs to, or null when it is not one. */
export function portalOf(address: string): string | null {
  let host: string;
  try {
    host = sourceKey(siteOrigin(address));
  } catch {
    return null;
  }
  return PORTALS.find((portal) => host === portal || host.endsWith(`.${portal}`)) ?? null;
}

export type ProbeResult =
  | {
      readable: true;
      origin: string;
      source: string;
      count: number;
      sample: {
        url: string;
        title: string | null;
        price: number | null;
        year: number | null;
        mileageKm: number | null;
        photos: number;
      } | null;
    }
  | { readable: false; origin: string | null; reason: string };

export async function probeWebsite(
  address: string,
  fetcher: PoliteFetcher = createPoliteFetcher({ delayMs: 300 }),
): Promise<ProbeResult> {
  const portal = portalOf(address);
  if (portal) {
    return {
      readable: false,
      origin: null,
      reason: `${portal} is a listings portal. Rynet only reads a dealership's own website, never a portal's copy of their stock, because the portals forbid it. Ask the dealership for their own site, or load their stock from a spreadsheet.`,
    };
  }

  let origin: string;
  try {
    origin = siteOrigin(address);
  } catch {
    return { readable: false, origin: null, reason: "That is not a web address." };
  }

  let urls: string[];
  try {
    urls = listingUrlsFromSitemap(await fetcher.text(motorsSitemap(origin)), origin);
  } catch (error) {
    return {
      readable: false,
      origin,
      reason: `Rynet cannot read this site automatically yet. It has no car list in the place a WordPress dealership site keeps one (${(error as Error).message}). Load their stock from a spreadsheet instead.`,
    };
  }

  if (urls.length === 0) {
    return {
      readable: false,
      origin,
      reason:
        "The site has a car list but no cars in it right now. Check the site in a browser: if it shows cars, it is built differently and needs a spreadsheet.",
    };
  }

  const first = urls[0] as string;
  try {
    const html = await fetcher.text(first);
    if (!looksLikeMotorsListing(html)) {
      return {
        readable: false,
        origin,
        reason:
          "The site lists cars, but its car pages are laid out in a way Rynet does not read yet. Load their stock from a spreadsheet instead.",
      };
    }
    const listing = parseMotorsListing(html, first, sourceKey(origin));
    return {
      readable: true,
      origin,
      source: sourceKey(origin),
      count: urls.length,
      sample: {
        url: first,
        title: listing.title,
        price: listing.price,
        year: listing.year,
        mileageKm: listing.mileageKm,
        photos: listing.photoUrls.length,
      },
    };
  } catch (error) {
    return {
      readable: false,
      origin,
      reason: `The site lists ${urls.length} cars but the first one could not be opened (${(error as Error).message}). Try again in a few minutes.`,
    };
  }
}
