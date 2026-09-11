/**
 * Source photographs for the seeded demonstration stock, from Wikimedia Commons.
 *
 * WHY THIS EXISTS
 *
 * The design was built around having no photography, and that turned out to be the whole
 * problem with it: every competitor in this market is built on photographs of cars, and a car
 * marketplace with coloured rectangles where the cars go reads as an empty state no matter how
 * good the typography is. The colour plate stays, as the fallback for a listing that genuinely
 * has no photograph, which is what it was always for. It stops being the identity of the site.
 *
 * WHY COMMONS AND NOT A STOCK LIBRARY
 *
 * Two reasons, and the second one matters more.
 *
 * The licence is clear. Everything here is CC BY-SA or freer, commercial use allowed, and the
 * photographer and licence are recorded per file and written into the media record's `credit`
 * field, so the attribution obligation is met on the page rather than in a spreadsheet.
 *
 * And the cars are REAL AND NAMED. A Commons file titled "Toyota Hilux GR Sport" is a
 * photograph of a Toyota Hilux, identified by the person who took it. That is the difference
 * between illustrating a demonstration listing and fabricating one: the photo on a seeded
 * Hilux is a Hilux. It is not THAT Hilux, which is why every seeded listing says so on its own
 * card, but it is not a picture of a different car pretending to be this one either.
 *
 * Usage:
 *   npx tsx scripts/fetch-demo-photos.ts            # fetch anything missing
 *   npx tsx scripts/fetch-demo-photos.ts --refresh  # re-fetch everything
 */

import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { MAKES } from "../src/seed/data/vehicles";

const OUT_DIR = path.join(process.cwd(), "src", "seed", "photos");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const API = "https://commons.wikimedia.org/w/api.php";

/**
 * A photo has to be usable, and most of Commons is not.
 *
 * Commons is an encyclopaedia's picture library, not a dealer's. Searching "Toyota Hilux"
 * returns a fire service Hilux at a village carnival, a rally car mid-jump, a wrecked one, a
 * museum exhibit and a police vehicle before it returns anything resembling stock. None of
 * those illustrate a car for sale, so they are excluded by name.
 */
const REJECT = [
  // In service as something other than a car for sale
  "police",
  "polizei",
  "politie",
  "fire",
  "brandweer",
  "ambulance",
  "rescue",
  "military",
  "army",
  "taxi",
  "uber",
  "driving school",
  "delivery",
  // Motorsport. The first pass let a rally Hyundai and a one-make cup Volkswagen through,
  // because the titles said "R5" and "Cup" rather than "rally".
  "rally",
  "race",
  "racing",
  "wrc",
  "dakar",
  "motorsport",
  "circuit",
  "cup",
  "trophy",
  "gt3",
  "gt4",
  " r5",
  "safari",
  "raid",
  "stage",
  "rallye",
  "hillclimb",
  "drift",
  // Not a car anyone is buying
  "crash",
  "wreck",
  "accident",
  "burnt",
  "abandoned",
  "rust",
  "junk",
  "scrap",
  "barn",
  // An event photo rather than a car photo
  "museum",
  "carnival",
  "parade",
  "protest",
  "revival",
  "classic car",
  "oldtimer",
  "vintage",
  "meeting",
  "meet",
  "festival",
  "auction",
  // Not a whole car, or not the front of one. The first pass took a Renault Kiger dashboard,
  // a Mercedes A-Class rear badge crop and two rear views, because none of those titles used
  // the word "interior".
  "interior",
  "engine",
  "dashboard",
  "badge",
  "logo",
  "wheel",
  "headlight",
  "taillight",
  "emblem",
  "diagram",
  "drawing",
  "svg",
  "map",
  "chart",
  "sticker",
  "seat",
  "boot",
  "cutaway",
  "chassis",
  "detail",
  "cockpit",
  "cabin",
  "steering",
  "console",
  "rear view",
  "rear-view",
  "back view",
  "underside",
  "roof",
  "trunk",
  "exhaust",
  "grille",
  // Not a real car
  "toy",
  "model car",
  "miniature",
  "lego",
  "replica",
  // Conditions a dealer does not photograph stock in
  "snow",
  "flood",
  "spy",
  "camouflage",
  "prototype",
  "concept",
  "night",
];

/** Landscape and big enough to fill a card, a hero and a 1280 gallery derivative. */
const MIN_WIDTH = 1280;
const MIN_RATIO = 1.2;

type Candidate = {
  title: string;
  url: string;
  descriptionUrl: string;
  width: number;
  height: number;
  licence: string;
  author: string;
};

type Entry = {
  make: string;
  model: string;
  body: string;
  file: string;
  title: string;
  licence: string;
  author: string;
  source: string;
};

const stripTags = (value: string) =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** One retry, because a single DNS failure should not end a run of sixty. */
async function withRetry<T>(work: () => Promise<T>, label: string): Promise<T | null> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (attempt === 3) {
        console.log(`  gave up on ${label}: ${(error as Error).message}`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  return null;
}

async function search(query: string): Promise<Candidate[]> {
  const url =
    `${API}?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=25` +
    `&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1600`;

  const response = await fetch(url, {
    headers: { "user-agent": "rynet-demo-photos/1.0 (https://rynet.co.za; demo seed data)" },
  });
  if (!response.ok) return [];

  const body = (await response.json()) as {
    query?: { pages?: Record<string, Record<string, unknown>> };
  };
  const pages = body.query?.pages;
  if (!pages) return [];

  const out: Candidate[] = [];
  for (const page of Object.values(pages)) {
    const info = (page.imageinfo as Record<string, unknown>[] | undefined)?.[0];
    if (!info) continue;
    const meta = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
    out.push({
      title: String(page.title ?? ""),
      url: String(info.thumburl ?? info.url ?? ""),
      descriptionUrl: String(info.descriptionurl ?? ""),
      width: Number(info.width ?? 0),
      height: Number(info.height ?? 0),
      licence: meta.LicenseShortName?.value ?? "unknown",
      author: stripTags(meta.Artist?.value ?? "unknown"),
    });
  }
  return out;
}

function usable(candidate: Candidate, make: string): boolean {
  const title = candidate.title.toLowerCase();

  if (!/\.(jpe?g|png)$/i.test(candidate.title)) return false;

  /*
   * Whole words, not substrings, and this cost the entire Toyota range.
   *
   * "toy" is on the reject list, to keep out photographs of model cars. Every Toyota filename
   * contains the string "toy". So Hilux, Fortuner, Corolla Cross, Starlet and Land Cruiser
   * Prado all reported "no usable photo", which is the best-selling make in this market and
   * the five models the site carries most of.
   */
  if (REJECT.some((word) => new RegExp(`\b${word}\b`, "i").test(title))) return false;

  // The make has to be in the filename. Commons search is generous and will offer a Ford for
  // a query about a Toyota if the description mentions one.
  if (!title.includes(make.toLowerCase().split(" ")[0] ?? "")) return false;

  // A licence with no commercial use is no use here, whatever it looks like.
  const licence = candidate.licence.toLowerCase();
  if (licence.includes("nc") || licence.includes("nd") || licence === "unknown") return false;

  if (candidate.width < MIN_WIDTH) return false;
  if (candidate.height > 0 && candidate.width / candidate.height < MIN_RATIO) return false;

  return true;
}

/**
 * Score the survivors rather than taking the first.
 *
 * Taking the first usable candidate gave a 1970s BMW 3 Series for a listing priced like a 2022
 * one, a 1990s Ford Puma coupe for the current crossover, and a Mercedes photographed at speed.
 * All three are real photographs of the real model and none of them illustrates a car on a
 * forecourt. The order Commons returns is relevance to the search engine, not usefulness here.
 */
function score(candidate: Candidate, _make: string, model: string): number {
  const title = candidate.title.toLowerCase();
  let points = 0;

  // Naming the model is the strongest signal that it is the right car.
  if (title.includes(model.toLowerCase())) points += 40;

  // A front three-quarter is the shot a dealer takes, and the word is usually in the title.
  if (title.includes("front")) points += 25;
  if (title.includes("side") || title.includes("profile")) points += 5;

  // A recent model year in the filename. The seeded stock is 2018 onwards, so a photograph of
  // the generation before last is the wrong car wearing the right name.
  const year = title.match(/(19|20)\d{2}/);
  if (year) {
    const value = Number(year[0]);
    if (value >= 2018) points += 30;
    else if (value >= 2012) points += 10;
    else points -= 40;
  }

  // Motor show photographs are clean, well lit and shot against a plain stand, which is closer
  // to dealer photography than a street shot is.
  if (title.includes("iaa") || title.includes("gims") || title.includes("auto show")) points += 10;

  // Landscape, and the closer to the card's own 16:10 the less it has to be cropped.
  if (candidate.height > 0) {
    const ratio = candidate.width / candidate.height;
    points += Math.max(0, 15 - Math.abs(ratio - 1.6) * 20);
  }

  return points;
}

function best(candidates: Candidate[], make: string, model: string): Candidate | undefined {
  const usableOnes = candidates.filter((candidate) => usable(candidate, make));
  if (usableOnes.length === 0) return undefined;
  return usableOnes.sort((a, b) => score(b, make, model) - score(a, make, model))[0];
}

async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    headers: { "user-agent": "rynet-demo-photos/1.0 (https://rynet.co.za; demo seed data)" },
  });
  if (!response.ok || !response.body) throw new Error(`${response.status} for ${url}`);
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(destination));
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  await mkdir(OUT_DIR, { recursive: true });

  let existing: Entry[] = [];
  if (!refresh) {
    try {
      existing = JSON.parse(await readFile(MANIFEST, "utf8")) as Entry[];
    } catch {
      existing = [];
    }
  }
  const have = new Set(existing.map((entry) => `${entry.make}|${entry.model}`));

  const wanted: { make: string; model: string; body: string }[] = [];
  for (const make of MAKES) {
    for (const model of make.models) {
      wanted.push({ make: make.name, model: model.name, body: model.body });
    }
  }

  console.log(`${wanted.length} models, ${have.size} already have a photo`);

  const results: Entry[] = [...existing];
  let fetched = 0;
  let missed = 0;

  for (const item of wanted) {
    const key = `${item.make}|${item.model}`;
    if (have.has(key)) continue;

    // Two passes: the specific query first, then the make on its own, because a model that is
    // only sold in South Africa may have nothing on Commons under that exact name.
    const first = (await withRetry(() => search(`${item.make} ${item.model}`), key)) ?? [];
    const second = (await withRetry(() => search(`${item.make} ${item.model} front`), key)) ?? [];
    let pick = best([...first, ...second], item.make, item.model);

    if (!pick) {
      const third = (await withRetry(() => search(`${item.make} ${item.body}`), key)) ?? [];
      pick = best(third, item.make, item.model);
    }

    if (!pick) {
      console.log(`  no usable photo: ${item.make} ${item.model}`);
      missed += 1;
      continue;
    }

    const slug = `${item.make}-${item.model}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const file = `${slug}.jpg`;

    try {
      const ok = await withRetry(
        () => download(pick.url, path.join(OUT_DIR, file)),
        `${key} download`,
      );
      if (ok === null) throw new Error("download failed after three attempts");
      results.push({
        make: item.make,
        model: item.model,
        body: item.body,
        file,
        title: pick.title.replace(/^File:/, ""),
        licence: pick.licence,
        author: pick.author,
        source: pick.descriptionUrl,
      });
      fetched += 1;
      console.log(`  ${item.make} ${item.model}  <-  ${pick.title.slice(5, 60)} (${pick.licence})`);
      // Written after every success, not at the end. The first run lost seventeen downloads
      // to a DNS blip on the eighteenth, because the manifest was only written once the whole
      // list had been walked.
      await writeFile(MANIFEST, `${JSON.stringify(results, null, 2)}\n`);
    } catch (error) {
      console.log(`  download failed: ${item.make} ${item.model}: ${(error as Error).message}`);
      missed += 1;
    }

    // Commons asks for a gentle rate. This runs once.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  await writeFile(MANIFEST, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nfetched ${fetched}, missed ${missed}, manifest holds ${results.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
