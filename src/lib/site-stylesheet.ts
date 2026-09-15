import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The compiled site stylesheet's public url, for the one page that must not import it.
 *
 * The global not-found (src/app/not-found.tsx) sits above both route groups. Anything it imports
 * is attached to the root not-found boundary, and Next sends that boundary's styles inside the
 * React payload of EVERY page. With `experimental.inlineCss` on, that meant the whole stylesheet
 * travelled three times in each document: once as the inline <style>, once in the payload for the
 * route's own layout, and once more for a 404 nobody was looking at. Gzip cannot fold copies that
 * sit about 100KB apart, so each one cost its full compressed size, and on a throttled mid-range
 * Android the extra copy alone held the home page's largest paint at about two seconds. Measured
 * on the same server, five cold loads each: home 1844 to 2028ms with the import, 1492ms without;
 * /cars 1524 to 1692ms, 1452ms without.
 *
 * So the global not-found links the stylesheet instead of importing it, and this finds the file.
 * The hashed filename changes on every build, so it is read out of the build output, once, and
 * kept for the life of the process, exactly as src/lib/font-preload.ts finds the display face.
 * The file is identified by a class only the site stylesheet defines, which keeps it apart from
 * the admin panel's stylesheets in the same folder.
 *
 * In dev there is no build output and this returns null: the global 404 renders unstyled under
 * `next dev`. Every 404 raised inside a route group (an unknown listing, dealership or facet)
 * is unaffected, because those render inside their group's layout.
 */

/** `undefined` means not looked yet, `null` means looked and found nothing. */
let cached: string | null | undefined;

const SITE_MARKER = ".rn-vcard";

async function findSiteStylesheet(): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), ".next", "static", "chunks");
    const files = await readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".css")) continue;
      const css = await readFile(path.join(dir, file), "utf8");
      if (css.includes(SITE_MARKER)) return `/_next/static/chunks/${file}`;
    }
  } catch {
    // No build output to read, which is dev.
  }

  return null;
}

export async function siteStylesheetUrl(): Promise<string | null> {
  if (cached === undefined) cached = await findSiteStylesheet();
  return cached;
}
