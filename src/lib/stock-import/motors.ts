import { blockWithClass, decodeEntities, listItems, sitemapLocations, textOf } from "./html";
import { cleanDescription, firstNumber, wholeRands } from "./text";
import type { SourceListing } from "./types";

/**
 * Reading a car off a dealership website built on WordPress with the Motors theme.
 *
 * WHY ONE THEME
 *
 * Motors (by StylemixThemes) is what a large share of small South African dealerships run their
 * own websites on, Amico Motors among them. Every site built on it prints a car the same way: a
 * two column table of labels and values, a price block, a paragraph of prose and a gallery of
 * full size photographs, with a sitemap of every listing at /listings-sitemap.xml. So one reader
 * covers every one of those dealerships, and onboarding one becomes pasting their address.
 *
 * WHAT THIS IS AND IS NOT
 *
 * A reader for a dealership's OWN website, used only with that dealership's permission. It is
 * never pointed at the portals: AutoTrader and Cars.co.za both forbid copying their listings and
 * both claim rights in the advert. The onboarding screen asks for the dealership's own address
 * and refuses a portal's.
 *
 * Two details worth knowing, both true of every Motors site seen so far:
 *
 *   - The WordPress post number is in the body class, as `postid-8978`. It survives a retitled
 *     page, which the address does not, so it is what a car is matched on from one run to the
 *     next. The address is the fallback.
 *   - The page is rendered twice, once for desktop and once for phones, with one copy hidden by
 *     CSS. Every read here takes the first copy and ignores the second.
 *
 * The Engine column holds "2", "12", "1400" and "1.0" on different cars, three different units
 * and no way to tell which is which, so engine size is left empty rather than guessed at.
 */

/** The host of an address, without www, which is how a stock list is named on every car. */
export function sourceKey(siteUrl: string): string {
  return new URL(siteUrl).hostname.replace(/^www\./i, "").toLowerCase();
}

/** The site's origin, https and no trailing slash, from whatever a person pasted. */
export function siteOrigin(input: string): string {
  const withScheme = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  const url = new URL(withScheme);
  return `${url.protocol === "http:" ? "http:" : "https:"}//${url.host}`;
}

/** Where a Motors site lists every car it has. */
export function motorsSitemap(origin: string): string {
  return `${origin}/listings-sitemap.xml`;
}

/** A listing page on this site: /listings/<name>/ and nothing else. */
export function isMotorsListingUrl(url: string, origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
  return (
    parsed.hostname.replace(/^www\./i, "").toLowerCase() === host &&
    /^\/listings\/[^/]+\/?$/i.test(parsed.pathname)
  );
}

/** The name at the end of a listing address, used for reading and for the fallback identifier. */
export function listingSlug(url: string): string {
  const match = url.match(/\/listings\/([^/?#]+)/i);
  return match?.[1] ?? "";
}

/** Every listing address in a Motors sitemap that belongs to this site, each once. */
export function listingUrlsFromSitemap(xml: string, origin: string): string[] {
  return [...new Set(sitemapLocations(xml).filter((url) => isMotorsListingUrl(url, origin)))];
}

/**
 * Text as a list would store it.
 *
 * Motors sites write "4x4" with a multiplication sign (U+00D7) where the x should be. A buyer
 * types the letter, so a search only ever finds the letter.
 */
export function plainText(input: string): string {
  return input.replace(/(\d)\s?×\s?(\d)/g, "$1x$2");
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

/** What the site calls itself, from its own social card, so it can be taken off a car's name. */
export function siteName(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const name = og?.[1] ? decodeEntities(og[1]).trim() : "";
  return name.length > 0 ? name : null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The page's own name for the car, with the business's name taken off the end of it.
 *
 * Motors sites title a page "2018 Ford Ranger - Their Dealership", and the second half is not the
 * car. The names to take off are the site's own (from its social card) plus any the caller knows.
 */
export function pageTitle(html: string, alsoStrip: readonly string[] = []): string | null {
  const structured = html.match(
    /"@type"\s*:\s*"WebPage"[\s\S]{0,400}?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  );
  const raw =
    structured?.[1] !== undefined
      ? decodeEntities(structured[1].replace(/\\"/g, '"').replace(/\\\//g, "/"))
      : textOf(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");

  const names = [siteName(html), ...alsoStrip].filter((name): name is string => Boolean(name));
  let trimmed = raw;
  if (names.length > 0) {
    const pattern = new RegExp(
      `\\s*[-|\\u2013\\u2014]\\s*(?:${names.map(escapeRegExp).join("|")}).*$`,
      "i",
    );
    trimmed = trimmed.replace(pattern, "");
  }
  trimmed = plainText(trimmed).trim();
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
 * that happens, and the rules that decide what to do about it live in one place (decide.ts)
 * rather than being spread through the reading.
 */
export function parseMotorsListing(
  html: string,
  url: string,
  source: string,
  alsoStrip: readonly string[] = [],
): SourceListing {
  const specs = specTable(html);
  const slug = listingSlug(url);
  const postId = html.match(/\bpostid-(\d+)\b/)?.[1] ?? null;
  const description = cleanDescription(textOf(blockWithClass(html, "post-content") ?? ""));
  const features = listItems(blockWithClass(html, "grouped_features") ?? "");

  return {
    source,
    externalId: postId ?? url.replace(/\/$/, ""),
    url,
    slug,
    title: pageTitle(html, alsoStrip),
    makeText: specs.make ?? null,
    modelText: specs.model ?? null,
    year: listedYear(specs, slug),
    mileageKm: firstNumber(specs.mileage ?? null),
    price: listedPrice(html),
    exteriorColourText: specs["exterior color"] ?? specs["exterior colour"] ?? specs.colour ?? null,
    interiorColourText: specs["interior color"] ?? specs["interior colour"] ?? null,
    transmissionText: specs.transmission ?? null,
    fuelText: specs["fuel type"] ?? specs.fuel ?? null,
    bodyText: specs.body ?? specs["body type"] ?? null,
    driveText: specs.drive ?? specs.drivetrain ?? null,
    description: description.text,
    removedContactDetails:
      description.removedPhones + description.removedEmails + description.removedNames,
    features,
    photoUrls: photoUrls(html),
  };
}

/** True when a page looks like a Motors listing: the spec table or the price block is there. */
export function looksLikeMotorsListing(html: string): boolean {
  return /\bt-label\b/.test(html) || /\bsingle-car-prices\b/.test(html);
}
