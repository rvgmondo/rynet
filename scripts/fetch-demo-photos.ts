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
  // Touring cars, which are road shapes in racing colours and pass every other test.
  "btcc",
  "dtm",
  "wtcr",
  "touring car",
  "nascar",
  "formula",
  "endurance",
  "le mans",
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
  "classic",
  "classics",
  "adac",
  "concours",
  "heritage",
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

/**
 * Files that passed every rule and are still wrong, rejected by looking at them.
 *
 * No amount of filename reading catches a Hilux parked behind a covered motorbike, a Chery
 * photographed from a bridge across a motorway, a BMW with a bollard in front of it, or a
 * Commons file called "Toyota Starlet Glanza" that is a photograph of a 1990s Starlet GT. The
 * metadata on all of those is clean. The pictures are not.
 *
 * So the last gate is a person opening the contact sheet. Anything on this list has been
 * looked at and refused, and the run picks the next candidate instead. A model with nothing
 * left keeps its colour plate, which is the point of having one.
 *
 * Five models ended there, and it is worth saying which and why rather than leaving somebody
 * to wonder whether the run broke. Polo Vivo and Pik Up are sold almost nowhere but South
 * Africa and Commons has close to nothing of either. Every Starlet on Commons is the 1990s
 * hatchback, not the car Toyota sells here under that name. The Tiggo 4 Pro exists only in one
 * photographer's set, all of it taken from a motorway bridge. The A-Class is there under its
 * engine badges and none of those files is of the current shape. All five show the colour
 * plate, which is a better answer than a photograph of a different car.
 */
const REVIEWED_AND_REJECTED = new Set(
  [
    "2020 Toyota Hilux E (front left side view).jpg",
    "Moscow, Toyota Starlet Glanza, June 2026 02.jpg",
    "2022 Suzuki Swift 1.2 GLX Automatic in Pure White, front right.jpg",
    "Chery Tiggo 4 Pro 1.5T Elite (2022) (52721426637).jpg",
    "Moscow, Chery Tiggo 7 promax white, Sept 2025 00.jpg",
    "2016 BMW 3 Series sedan in Mineral Grey Metallic, front view parked on residential street.jpg",
    "Mercedes-Benz C-Class All-Terrain IAA 2021 1X7A0279.jpg",
    "Osaka Auto Messe 2019 (102) - Mercedes-Benz A-Class (W176) tuned by Reve Design.jpg",
    "Mahindra Pik Up 2.2 mHawk S10 4x4 Double-Cab (2018) (52722434943).jpg",
    "2025 BMW 3 Series 320e BTCC Car.jpg",
    "Mercedes-Benz C-Class W204 facelift Shishi 01 2022-10-02.jpg",
    "Mercedes-Benz A-Class W176 Sanming 01 2022-07-28.jpg",
    "2019 BMW 3-Series 335d M-Sport (F31) - 3.0 xDrive (310PS) Automatic - 2025-04-05, Front Left.jpg",
    "Mercedes-Benz C-Class, 18. ADAC Stormarn Classic, Luetjensee (20250405-TR257069).jpg",
    "2022 Toyota Hilux 2.4 FX, front left.jpg",
    "Toyota Starlet 1.5 XR Auto (2022).jpg",
    "2021 Suzuki Swift Sport 1.4 auto yellow front view in Brunei.jpg",
    "Chery Tiggo 4 Pro 1.5T Elite (2022) (52722210544).jpg",
    "Moscow, Chery Tiggo 7 promax white, Sept 2025 03.jpg",
    "Mahindra Pik Up 2.2 mHawk S6 Single-Cab (2021) (52722431928).jpg",
    "Toyota Starlet 1.5 XR Auto (2023).jpg",
    "Chery Tiggo 4 Pro 1.5T Elite (2022) (52722209894).jpg",
    "Mahindra Pik Up 2.2 mHawk S10 4x4 Double-Cab (2018) (52721427362).jpg",
    "Moscow, Toyota Starlet Glanza, June 2026 03.jpg",
    "Chery Tiggo 4 Pro 1.5T Elite (2022) (52722359155).jpg",
  ].map((title) => title.toLowerCase()),
);

/** Landscape and big enough to fill a card, a hero and a 1280 gallery derivative. */
const MIN_WIDTH = 1280;
const MIN_RATIO = 1.2;

/**
 * The generation gate, and the reason the first set had to be thrown away.
 *
 * It put a 2004 Isuzu D-Max on a 2023 D-Max listing and a 1990s Toyota Starlet GT on a 2025
 * Starlet. Both are real photographs of a car by that name taken by a named photographer, and
 * both are the wrong car by twenty years. The page says "photograph of this model, not of this
 * car"; a photograph of the generation before last does not honour even that.
 *
 * So a candidate has to carry evidence that it is the current shape: a model year in the
 * filename, recent enough, and nothing in the capture date that contradicts it. Commons names
 * car photographs with a year often enough for that to be affordable, and a model with no
 * survivor keeps its colour plate, which is the honest answer rather than the wrong car.
 */
const OLDEST_MODEL_YEAR = 2015;

/**
 * What a model is called on Commons, when that is not what it is called on a price list.
 *
 * The filename has to name the model, because the claim printed under the photograph is about
 * the model. Commons names German cars by their engine badge and their chassis code, so there
 * is no file called "BMW 3 Series 2021" and plenty called "BMW 320i G20". Without these the
 * two best selling premium models on the site have no photograph at all.
 *
 * Every alias here is a name for the SAME current car. A chassis code is the strictest kind of
 * alias there is: G20 is a 3 Series and nothing else.
 */
const MODEL_ALIASES: Record<string, string[]> = {
  "3 series": ["3 series", "3-series", "320i", "320d", "330i", "330e", "318i", "g20", "g21"],
  "1 series": ["1 series", "1-series", "118i", "120i", "128ti", "f40", "f70"],
  "a-class": ["a-class", "a class", "a 180", "a180", "a 200", "a200", "a 250", "a250", "w177"],
  "c-class": ["c-class", "c class", "c 200", "c200", "c 220", "c220", "c 300", "c300", "w206"],
};

function namesModel(title: string, model: string): boolean {
  const wanted = MODEL_ALIASES[model.toLowerCase()] ?? [model.toLowerCase()];
  return wanted.some((alias) => title.includes(alias));
}

function yearIn(value: string): number | null {
  /*
   * A model year, not the day the photograph was uploaded.
   *
   * "Mercedes-Benz C-Class W204 facelift Shishi 01 2022-10-04" is a 2007 car photographed in
   * 2022, and reading the first four digits out of it put a fifteen year old shape on a
   * current listing. Full dates are struck out before the year is read, so a title that
   * carries only a capture date has no model year at all and fails the gate.
   */
  const withoutDates = value.replace(/(?:19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}/g, " ");
  const match = withoutDates.match(/(?:19|20)[0-9]{2}/);
  return match ? Number(match[0]) : null;
}

type Candidate = {
  title: string;
  url: string;
  descriptionUrl: string;
  width: number;
  height: number;
  licence: string;
  author: string;
  /** Whatever Commons holds as the date, which is usually the EXIF capture date. */
  taken: string;
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
    `&gsrnamespace=6&gsrlimit=50` +
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
      taken: stripTags(meta.DateTimeOriginal?.value ?? meta.DateTime?.value ?? ""),
    });
  }
  return out;
}

function usable(candidate: Candidate, make: string, model: string): boolean {
  const title = candidate.title.toLowerCase();

  if (!/\.(jpe?g|png)$/i.test(candidate.title)) return false;

  if (REVIEWED_AND_REJECTED.has(title.replace(/^file:/, ""))) return false;

  /*
   * Whole words, not substrings, and this cost the entire Toyota range.
   *
   * "toy" is on the reject list, to keep out photographs of model cars. Every Toyota filename
   * contains the string "toy". So Hilux, Fortuner, Corolla Cross, Starlet and Land Cruiser
   * Prado would all report "no usable photo", which is the best-selling make in this market
   * and the five models the site carries most of.
   */
  // Whole words, built with an escaped backslash: `\b` inside a template literal is
  // the BACKSPACE character, not a word boundary, so every one of these tests was matching
  // nothing at all. That is why a museum piece, a rally car and a rear-end crop all got
  // through a list written to keep them out.
  if (REJECT.some((word) => new RegExp(`\\b${word}\\b`, "i").test(title))) return false;

  // The make AND the model have to be in the filename. Commons search is generous and will
  // offer a Ford for a query about a Toyota if the description mentions one, and the claim
  // made on the page is about the model, so the model is the part that has to hold.
  if (!title.includes(make.toLowerCase().split(" ")[0] ?? "")) return false;
  if (!namesModel(title, model)) return false;

  // The current shape, on the evidence of the filename, with nothing in the capture date
  // against it. A photograph taken in 2009 cannot be of a car sold in 2023.
  const named = yearIn(title);
  if (named === null || named < OLDEST_MODEL_YEAR) return false;
  const shot = yearIn(candidate.taken);
  if (shot !== null && shot < OLDEST_MODEL_YEAR) return false;

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
  const usableOnes = candidates.filter((candidate) => usable(candidate, make, model));
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
    /*
     * Three queries, all of them naming the model. The old third pass asked for the make and
     * the body type, which cannot satisfy a rule that the model be in the filename and was
     * only ever a way of talking the search into an answer it did not have.
     */
    const first = (await withRetry(() => search(`${item.make} ${item.model}`), key)) ?? [];
    const second = (await withRetry(() => search(`${item.make} ${item.model} front`), key)) ?? [];
    const third = (await withRetry(() => search(`${item.make} ${item.model} 2022`), key)) ?? [];
    const pick = best([...first, ...second, ...third], item.make, item.model);

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
