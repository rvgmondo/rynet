import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

/**
 * Turn the reviewed picks into the committed demonstration photo set.
 *
 *   node scripts/demo-photos/build-manifest.mjs <candidates-dir>
 *
 * <candidates-dir> is the output of a gather run: up to ten Commons candidates per model,
 * named <slug>--<n>.jpg, with a candidates.json beside them. picks.json, next to this file,
 * is what a person chose after looking at every candidate on a contact sheet: for each model,
 * the candidate numbers worth keeping and the colour family of the car in each.
 *
 * WHY A PERSON CHOOSES
 *
 * The automated rules got the set to "a real photograph of a car with this model's name on it"
 * and no further. Nine files passed every rule and were still wrong: a Starlet that was the
 * 1990s hatchback, a Hilux behind a covered motorbike, a Chery shot from a motorway bridge.
 *
 * WHAT IT WRITES
 *
 * One WebP per pick into src/seed/photos, 1280px wide at most, and a manifest recording the
 * pixel size and byte size of each. Those two numbers are what let the database migration
 * register the photographs on the live host without sharp or a build step there: it writes the
 * media rows directly rather than processing uploads.
 *
 * Two widths of each: the 1280px original for the listing gallery, and a 640px copy for every
 * card. The host never resizes anything on request (see `images.unoptimized` in next.config.ts),
 * so the card copy is not an optimisation, it is the only thing standing between a results page
 * and the browser downloading twenty four 1280px photographs.
 */

const CANDIDATES = process.argv[2];
if (!CANDIDATES) {
  console.error("usage: node scripts/demo-photos/build-manifest.mjs <candidates-dir>");
  process.exit(1);
}

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.resolve(HERE, "..", "..", "src", "seed", "photos");
const picks = JSON.parse(readFileSync(path.join(HERE, "picks.json"), "utf8"));
const candidates = JSON.parse(readFileSync(path.join(CANDIDATES, "candidates.json"), "utf8"));

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) {
  if (/\.(jpe?g|png|webp)$/i.test(file)) rmSync(path.join(OUT, file));
}

const manifest = [];
let bytes = 0;

for (const [key, list] of Object.entries(picks)) {
  const slug = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let n = 0;
  for (const [number, colour] of list) {
    const source = candidates.find((c) => c.file === `${slug}--${number}.jpg`);
    if (!source) throw new Error(`no candidate ${slug}--${number} in ${CANDIDATES}`);

    n += 1;
    const file = `${slug}--${n}.webp`;
    const target = path.join(OUT, file);
    const info = await sharp(path.join(CANDIDATES, source.file))
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 70, effort: 6 })
      .toFile(target);

    const filesize = statSync(target).size;
    bytes += filesize;

    const cardFile = `${slug}--${n}-640.webp`;
    const cardTarget = path.join(OUT, cardFile);
    const card = await sharp(target)
      .resize({ width: 640 })
      .webp({ quality: 72, effort: 6 })
      .toFile(cardTarget);
    const cardFilesize = statSync(cardTarget).size;
    bytes += cardFilesize;

    manifest.push({
      make: source.make,
      model: source.model,
      colour,
      file,
      width: info.width,
      height: info.height,
      filesize,
      card: { file: cardFile, width: card.width, height: card.height, filesize: cardFilesize },
      title: source.title,
      licence: source.licence,
      author: source.author,
      source: source.source,
    });
  }
}

writeFileSync(path.join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.length} photographs, ${(bytes / 1e6).toFixed(1)}MB`);
