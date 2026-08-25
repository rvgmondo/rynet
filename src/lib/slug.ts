/**
 * The one slug function.
 *
 * Ported from MotoHubSA, where four near-copies existed and only one handled accents
 * correctly. The lessons in the comments below were paid for once already.
 *
 * WHY THE ACCENT STEP MATTERS
 * `normalize("NFKD")` splits an accented character into its base letter plus a separate
 * combining mark: "e" plus U+0301. Strip the marks and you get the letter. Skip that step
 * and the next line, which replaces everything outside [a-z0-9] with a hyphen, turns each
 * mark into a hyphen instead, so "Citroen C4 Picasso" survives but "Peugeot 208 GT Line"
 * with a real accent would not. Skipping NFKD entirely is worse: the accented character is
 * not in [a-z0-9] at all, so it becomes a hyphen and the word loses a letter.
 */

/** Combining diacritical marks (U+0300 to U+036F), written as escapes so no editor mangles them. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Apostrophes, straight and curly. Dropped rather than hyphenated, so "Owner's manual"
 * slugs to `owners-manual` and not `owner-s-manual`.
 */
const APOSTROPHES = /['‘’ʼ]/g;

/**
 * Slugs that would collide with a facet route segment.
 *
 * The marketplace routes `/cars/[make]` alongside `/cars/in/...`, `/cars/body/...` and
 * `/cars/fuel/...`. A make slugged `in` would silently shadow every location landing page
 * on the site, and the failure would look like a routing bug rather than a data problem.
 * So the makes collection validates against this list, and adding a route segment means
 * adding it here.
 */
export const RESERVED_ROUTE_SLUGS = [
  "in",
  "body",
  "fuel",
  "new",
  "demo",
  "used",
  "under",
  "near",
  "all",
  "search",
  "compare",
  "page",
  "api",
  "admin",
  "portal",
  "digital",
  "dealers",
  "vehicles",
  "cars",
] as const;

export function slugify(value: string, maxLength = 190): string {
  return (
    value
      .normalize("NFKD")
      .replace(COMBINING_MARKS, "")
      .replace(APOSTROPHES, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength)
      // The slice can leave a trailing hyphen behind.
      .replace(/-+$/, "")
  );
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_ROUTE_SLUGS as readonly string[]).includes(slug);
}

/**
 * A short, stable public reference for a vehicle URL.
 *
 * Crockford base32: no I, L, O or U, so it cannot be misread over the phone and cannot
 * accidentally spell anything. Not the database id, because that leaks how much stock the
 * platform holds. Not the dealer's stock number, because dealers change those and the URL
 * must not move when they do.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function publicRef(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    const index = byte % CROCKFORD.length;
    out += CROCKFORD[index];
  }
  return out;
}

export function generatePublicRef(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return `RN${publicRef(bytes)}`;
}
