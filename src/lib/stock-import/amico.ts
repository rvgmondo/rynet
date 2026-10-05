import { blockWithClass, decodeEntities, listItems, textOf } from "./html";
import { cleanDescription, firstNumber, wholeRands } from "./text";
import type { SourceListing } from "./types";

/**
 * Reading a car off amicomotors.co.za.
 *
 * WHAT THIS IS AND IS NOT
 *
 * It is a reader for ONE dealership's own website, which Rynet has that dealership's permission to
 * list from. It is not a scraper for the portals: AutoTrader and Cars.co.za both forbid copying
 * their listings and both claim rights in the advert, so neither is ever read here or anywhere
 * else. That distinction is the whole reason this file names a single host.
 *
 * WHAT THE PAGE GIVES US
 *
 * The site runs WordPress with the Motors theme, which prints a car as a two column table of
 * labels and values, a price, a paragraph of prose and a gallery of full size photographs. All
 * four are read below. Two details are worth knowing:
 *
 *   - The WordPress post number is in the body class, as `postid-8978`. That is a stable
 *     identifier that survives a retitled page, which the address does not, so it is what a car
 *     is matched on from one run to the next. The address is the fallback when a page ever stops
 *     printing it.
 *   - The page is rendered twice, once for desktop and once for phones, with one copy hidden by
 *     CSS. Every read here takes the first copy and ignores the second.
 *
 * WHAT IT DOES NOT TRY TO READ
 *
 * The Engine column holds "2", "12", "1400" and "1.0" on different cars, which is three different
 * units and no way to tell which is which, so engine size is left empty rather than guessed at.
 * There is no VIN, no stock number and no sold marker anywhere on the site.
 */

export const AMICO_SOURCE = "amicomotors.co.za";
export const AMICO_ORIGIN = "https://amicomotors.co.za";
export const AMICO_SITEMAP = `${AMICO_ORIGIN}/listings-sitemap.xml`;

/** A listing page address, as the sitemap writes them: /listings/<name>/ and nothing else. */
export function isAmicoListingUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.)?amicomotors\.co\.za\/listings\/[^/]+\/?$/i.test(url);
}

/** The name at the end of a listing address, used for reading and for the fallback identifier. */
export function amicoSlug(url: string): string {
  const match = url.match(/\/listings\/([^/?#]+)/i);
  return match?.[1] ?? "";
}

/**
 * Text as a list would store it.
 *
 * The site writes "4x4" with a multiplication sign (U+00D7) where the x should be. A buyer types
 * the letter, so a search only ever finds the letter.
 */
export function plainText(input: string): string {
  return input.replace(/(\d)\s?\u00d7\s?(\d)/g, "$1x$2");
}

/** Every label and value in the car's own table, first copy of the page wins. */
export function specTable(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const row of html.matchAll(
    /<td[^>]*class=["'][^"']*\bt-label\b[^"']*["'][^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class=["'][^"']*\bt-value\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi,
  )) {
    const label = textOf(row[1] ?? "").toLowerCase();
    const value = plainText(textOf(row[2] ?? ""));
    if (label && value && !specs[label]) specs[label] = value;
  }
  return specs;
}

/** The page's own name for the car, with the group's name taken off the end of it. */
export function pageTitle(html: string): string | null {
  const structured = html.match(
    /"@type"\s*:\s*"WebPage"[\s\S]{0,400}?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  );
  const raw =
    structured?.[1] !== undefined
      ? decodeEntities(structured[1].replace(/\\"/g, '"').replace(/\\\//g, "/"))
      : textOf(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");

  const trimmed = plainText(
    raw.replace(/\s*[-|]\s*(?:SA Multi Franchise Motor Group|Amico Motors).*$/i, ""),
  ).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Full size photographs, in the order the gallery shows them, each one only once. */
export function photoUrls(html: string): string[] {
  const seen = new Set<string>();
  for (const link of html.matchAll(
    /<a[^>]+href=["'](https?:\/\/[^"']*\/wp-content\/uploads\/[^"']+\.(?:jpe?g|png|webp))["'][^>]*class=["'][^"']*\bstm_fancybox\b/gi,
  )) {
    const url = decodeEntities(link[1] ?? "");
    if (url && !/logo/i.test(url)) seen.add(url);
  }

  if (seen.size === 0) {
    // No gallery markup: fall back to the one image the page names as its own in structured data.
    const primary = html.match(
      /"@type"\s*:\s*"ImageObject"[\s\S]{0,400}?"contentUrl"\s*:\s*"([^"]+)"/,
    );
    const url = primary?.[1] ? decodeEntities(primary[1].replace(/\\\//g, "/")) : "";
    if (url) seen.add(url);
  }

  return [...seen];
}

/** The price the page shows, in whole rands, or null when it shows none. */
export function listedPrice(html: string): number | null {
  const block = blockWithClass(html, "single-car-prices");
  if (!block) return null;
  const regular = blockWithClass(block, "single-regular-price") ?? block;
  const price = wholeRands(textOf(regular));
  // A price widget that says "POA" or "Sold" has no number in it, and that is no price.
  return price && price > 0 ? price : null;
}

/** The year on the page, or the four digit year on the end of the address as a fallback. */
export function listedYear(specs: Record<string, string>, slug: string): number | null {
  const stated = firstNumber(specs.year ?? null);
  if (stated && stated >= 1950 && stated <= 2100) return stated;

  const fromSlug = slug.match(/(?:^|-)(19\d{2}|20\d{2})(?:-\d+)?$/);
  const year = fromSlug?.[1] ? Number.parseInt(fromSlug[1], 10) : null;
  return year && year >= 1950 && year <= 2100 ? year : null;
}

/**
 * One listing page, read into the shape the rest of the import works in.
 *
 * Every field can come back null. A page that has lost its price or its mileage is a real thing
 * that happens on this site, and the rules that decide what to do about it live in one place
 * rather than being spread through the reading.
 */
export function parseAmicoListing(html: string, url: string): SourceListing {
  const specs = specTable(html);
  const slug = amicoSlug(url);
  const postId = html.match(/\bpostid-(\d+)\b/)?.[1] ?? null;
  const description = cleanDescription(textOf(blockWithClass(html, "post-content") ?? ""));
  const features = listItems(blockWithClass(html, "grouped_features") ?? "");

  return {
    source: AMICO_SOURCE,
    // The post number where the page prints it, the address where it does not. Both are stable
    // enough to match on; only the first survives a retitled page.
    externalId: postId ?? url.replace(/\/$/, ""),
    url,
    slug,
    title: pageTitle(html),
    makeText: specs.make ?? null,
    modelText: specs.model ?? null,
    year: listedYear(specs, slug),
    mileageKm: firstNumber(specs.mileage ?? null),
    price: listedPrice(html),
    exteriorColourText: specs["exterior color"] ?? specs.colour ?? null,
    interiorColourText: specs["interior color"] ?? null,
    transmissionText: specs.transmission ?? null,
    fuelText: specs["fuel type"] ?? null,
    bodyText: specs.body ?? specs["body type"] ?? null,
    driveText: specs.drive ?? specs.drivetrain ?? null,
    description: description.text,
    removedContactDetails:
      description.removedPhones + description.removedEmails + description.removedNames,
    features,
    photoUrls: photoUrls(html),
  };
}
