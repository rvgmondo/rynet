import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The preload link for the display face, on the pages Next does not write one for.
 *
 * next/font already asks for a preload and already gets one, on STATIC routes. On a route
 * rendered on demand it does not: the link is emitted from the build manifest while a page
 * is being prerendered, and a dynamic route has no prerender to emit it from. So
 * /accessibility and /digital, which are prerendered, ship
 *
 *     <link rel="preload" as="font" ...>
 *
 * in the head, and the home page and /cars, which are not, ship nothing. The font is then
 * discovered only once the stylesheet has been fetched and parsed, which put it about two
 * seconds in and forced a full re-shape of everything already painted.
 *
 * That is not a fair trade to have made by accident. Both routes are dynamic because their
 * DATA is dynamic, which is a decision about a database, and it silently cost the two most
 * requested pages on the site their font preload.
 *
 * The hashed filename cannot be written down, because it changes on every build. It is read
 * out of the compiled stylesheet instead, once, and the answer is kept for the life of the
 * process: the file is immutable for as long as the build it belongs to is running.
 *
 * `-s.p.` is next/font's own marker for the face it considers worth preloading, so this
 * follows the loader's judgement rather than second-guessing it. In dev there is no compiled
 * stylesheet to read and this returns null, which is correct: there is nothing to preload
 * because the font is being served through the dev compiler anyway.
 */

/** `undefined` means not looked yet, `null` means looked and there is nothing to preload. */
let cached: string | null | undefined;

const PRELOADABLE_FACE = /\.\.\/media\/[A-Za-z0-9_-]+-s\.p\.[A-Za-z0-9_.-]+\.woff2(\?[^)"']*)?/;

async function findDisplayFont(): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), ".next", "static", "chunks");
    const files = await readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".css")) continue;

      const css = await readFile(path.join(dir, file), "utf8");
      const match = css.match(PRELOADABLE_FACE);
      if (match) return match[0].replace("../media/", "/_next/static/media/");
    }
  } catch {
    // No build output to read, which is dev. Nothing to preload.
  }

  return null;
}

export async function displayFontUrl(): Promise<string | null> {
  if (cached === undefined) cached = await findDisplayFont();
  return cached;
}
