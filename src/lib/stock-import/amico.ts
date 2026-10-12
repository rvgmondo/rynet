import {
  isMotorsListingUrl,
  listedPrice,
  listedYear,
  listingSlug,
  motorsSitemap,
  pageTitle,
  parseMotorsListing,
  photoUrls,
  plainText,
  specTable,
} from "./motors";
import type { SourceListing } from "./types";

/**
 * Amico Motors' own website, amicomotors.co.za.
 *
 * The site runs WordPress with the Motors theme, so the reading itself lives in motors.ts and is
 * shared with every other dealership on that theme. What is left here is what is true of this one
 * site: its address, and the two names its pages put after a car's name.
 *
 * Its listings are matched on `source: "amicomotors.co.za"`, written on every car it has ever
 * created, so that value must never change.
 */

export const AMICO_SOURCE = "amicomotors.co.za";
export const AMICO_ORIGIN = "https://amicomotors.co.za";
export const AMICO_SITEMAP = motorsSitemap(AMICO_ORIGIN);

/** The names Amico's pages put after a car, both of which the site uses. */
export const AMICO_TITLE_SUFFIXES = ["SA Multi Franchise Motor Group", "Amico Motors"] as const;

export function isAmicoListingUrl(url: string): boolean {
  return isMotorsListingUrl(url, AMICO_ORIGIN);
}

export const amicoSlug = listingSlug;

export function parseAmicoListing(html: string, url: string): SourceListing {
  return parseMotorsListing(html, url, AMICO_SOURCE, AMICO_TITLE_SUFFIXES);
}

export { listedPrice, listedYear, pageTitle, photoUrls, plainText, specTable };
