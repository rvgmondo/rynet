import { normaliseKey } from "./text";
import type { TaxonomyEntry } from "./types";

/**
 * Turning a dealership's words into Rynet's lists.
 *
 * THE RULE THIS FILE EXISTS TO KEEP
 *
 * Never put a car under a model it is not. A stock import that guesses is worse than one that
 * gives up, because a wrong model is invisible: the car looks fine on the page, it is simply
 * filed under something else and a buyer searching for it never sees it. So the matching here
 * only ever does these things, in this order:
 *
 *   1. Read a maker's own designation where the maker names cars by number: a BMW 218i is a
 *      2 Series and a Mercedes-Benz A 180 is an A-Class.
 *   2. Match what the source said to a list Rynet already keeps, by name, by web address name, or
 *      by one of the other names people use for it (the `aliases` field on every taxonomy, and
 *      `MODEL_ALIASES` below), on the START of the text and on whole words, so "Q3 1.4 TFSI" finds
 *      the Q3 and hands "1.4 TFSI" on as trim.
 *   3. Otherwise add the model the source named, cut from the front of its text.
 *
 * A page names its model twice, in its details table and in its title, and both are read. When
 * they agree, or one is simply the fuller name of the other, that is the model. When they name
 * two different models, nothing is chosen and nothing is added: see `chooseModel`.
 *
 * What it never does is find the nearest thing. "Q2" does not become "Q3", and no distance
 * between two strings is measured anywhere in this file.
 *
 * AND THE SECOND RULE
 *
 * Only makes and models are added. Variants are not, because a variant's web address name has to
 * be unique across every model on the platform, so importing one dealership's trim names would
 * quietly take those names away from every other make. Trim that matches nothing is kept on the
 * car as free text in "Extra trim details", where it is visible and costs nobody a name.
 */

/** Names a source uses that Rynet's lists do not, beyond the aliases already stored. */
export const SOURCE_ALIASES: Record<string, Record<string, string>> = {
  makes: {
    vw: "volkswagen",
    "mercedes benz": "mercedes-benz",
    mercedes: "mercedes-benz",
    "land rover": "land rover",
  },
  "body-types": {
    "double cab": "bakkie",
    "single cab": "bakkie",
    "extra cab": "bakkie",
    "super cab": "bakkie",
    "pick up": "bakkie",
    pickup: "bakkie",
    crossover: "suv",
    hatch: "hatchback",
    "station wagon": "station wagon",
    estate: "station wagon",
    minivan: "mpv",
    combi: "mpv",
  },
  transmissions: {
    auto: "automatic",
    automated: "automatic",
    steptronic: "automatic",
    tiptronic: "automatic",
    "7g tronic": "automatic",
    "s tronic": "dual clutch",
    stronic: "dual clutch",
    dsg: "dual clutch",
    "dual clutch": "dual clutch",
    "manual gearbox": "manual",
  },
  drivetrains: {
    "4wd": "four wheel drive",
    "4x4": "four wheel drive",
    awd: "all wheel drive",
    rwd: "rear wheel drive",
    fwd: "front wheel drive",
  },
  "fuel-types": {
    "petrol unleaded": "petrol",
    gasoline: "petrol",
    "diesel fuel": "diesel",
  },
  features: {
    abs: "abs with ebd",
    airbags: "driver and passenger airbags",
    "air conditioner": "climate control",
    "bluetooth radio": "bluetooth",
    "central locking": "keyless entry and start",
    "alloy rims": "alloy wheels",
    towbar: "tow bar",
    "park distance": "park distance control",
    "reverse camera": "reverse camera",
    "leather seats": "leather upholstery",
  },
};

/** Every way a list entry can be named: its name, its web address name and its other names. */
function keysOf(entry: TaxonomyEntry): string[] {
  const keys = [normaliseKey(entry.name)];
  if (entry.slug) keys.push(normaliseKey(entry.slug));
  for (const alias of entry.aliases ?? []) {
    const key = normaliseKey(alias);
    if (key) keys.push(key);
  }
  return keys.filter(Boolean);
}

/** "Hatchbacks" and "Hatchback" are the same word to a matcher, and so are "bakkies" and "bakkie". */
function singular(key: string): string {
  return key.endsWith("s") && key.length > 3 ? key.slice(0, -1) : key;
}

/**
 * The list entry a piece of source text means, or null.
 *
 * `aliases` is the per source map above: the key is what the source writes, the value is the
 * Rynet name it means. It is consulted before the entries, so a source word can be redirected
 * without touching the stored lists.
 */
export function findEntry(
  entries: TaxonomyEntry[],
  candidate: string | null | undefined,
  aliases: Record<string, string> = {},
): TaxonomyEntry | null {
  const wanted = normaliseKey(candidate ?? "");
  if (!wanted) return null;

  const redirected = aliases[wanted] ?? aliases[singular(wanted)] ?? wanted;
  const target = normaliseKey(redirected);

  for (const entry of entries) {
    const keys = keysOf(entry);
    if (keys.includes(target) || keys.includes(wanted)) return entry;
  }
  for (const entry of entries) {
    const keys = keysOf(entry).map(singular);
    if (keys.includes(singular(target)) || keys.includes(singular(wanted))) return entry;
  }
  // "Xtrail" and "X-Trail", "XUV 300" and "XUV300": the same name with the gap typed differently.
  const joined = (key: string) => key.replace(/ /g, "");
  for (const entry of entries) {
    const keys = keysOf(entry).map(joined);
    if (keys.includes(joined(target)) || keys.includes(joined(wanted))) return entry;
  }
  return null;
}

/**
 * The longest list entry that the source text STARTS with, and whatever is left over.
 *
 * Whole words only. "Polo Vivo" wins over "Polo" for "Polo Vivo 1.4 Trendline" because the longer
 * head is tried first, and "Polo" never matches "Polonaise" because the split is on spaces.
 */
export function findLeading(
  entries: TaxonomyEntry[],
  candidate: string | null | undefined,
  aliases: Record<string, string> = {},
): { entry: TaxonomyEntry; residue: string } | null {
  const words = (candidate ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  for (let take = words.length; take >= 1; take -= 1) {
    const entry = findEntry(entries, words.slice(0, take).join(" "), aliases);
    if (entry) return { entry, residue: words.slice(take).join(" ") };
  }
  return null;
}

/**
 * Words that start the trim rather than the model.
 *
 * An engine size (1.4, 2.0), a generation in roman numerals (IV, VII), a door count, a bare digit
 * left over from one, or a word a dealership types in front of a trim. Each one of these was in
 * Amico's own titles. A chassis code is not in the list, because it always arrives in brackets and
 * the bracket rule below catches it: matching bare "F45" would also have matched "i10" and cut a
 * Hyundai Grand i10 down to a Hyundai Grand.
 */
const TRIM_STARTS =
  /^(?:\d+[.,]\d+[a-z]*|\d\.\d|\d|\d+(?:dr|door|doors|seat|seater)|i{2,3}|iv|vi{1,3}|ix|xi{0,2}|mark|gp|facelift|fl)$/i;

/**
 * Splits "Corolla Quest 1.8 Prestige" into the model name and the trim after it.
 *
 * Used only when nothing in Rynet's list matched, to decide what the new model should be called.
 * The cut is at the first word that reads as trim rather than model, and the name is capped at
 * three words, because a model called "Ranger 2.2 TDCi XL Double Cab" is a trim with a model
 * hidden inside it and would split this dealership's own Rangers across several models.
 */
export function splitModelName(candidate: string): { name: string; trim: string } {
  // A bracketed word at the front is an aside, not the model: "(VW) Move up" is an up.
  const words = candidate
    .trim()
    .replace(/^\([^)]*\)\s*/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return { name: "", trim: "" };

  let cut = words.findIndex((word) => TRIM_STARTS.test(word) || word.startsWith("("));
  if (cut <= 0) cut = words.length;
  cut = Math.min(cut, 3);

  return { name: words.slice(0, cut).join(" "), trim: words.slice(cut).join(" ") };
}

/**
 * A model name written the way a list should read it.
 *
 * "spark" becomes "Spark" and "JUKE" becomes "Juke", while "RAV4", "i20", "X-Trail" and "CX-3" are
 * left exactly as they are. The rule is that a word with a digit or a capital already in it is
 * somebody's deliberate spelling, and only a plain lower case word is a typing accident.
 */
export function tidyModelName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (/^[A-Z]{4,}$/.test(trimmed)) {
    return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
  }
  return trimmed
    .split(" ")
    .map((word) => (/^[a-z]+$/.test(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Other names for real models, by make, and the name Rynet lists each one under.
 *
 * Every entry here is a fact about how a manufacturer names its cars, not a judgement about a
 * particular listing: a "Move up!" is a Volkswagen up!, an Evoque is a Range Rover Evoque, and a
 * "Cooper S Countryman" is a Countryman in Cooper S trim. The keys are written the way
 * `normaliseKey` writes text (lower case, punctuation gone), so "up!" and "Up" are the same key.
 *
 * Nothing here maps one model onto a different one. A Q2 is not a Q3, and there is no entry that
 * could make it one.
 */
export const MODEL_ALIASES: Record<string, Record<string, string>> = {
  ford: {
    "tourneo connect": "Tourneo Connect",
    "tourneo custom": "Tourneo Custom",
  },
  mahindra: {
    "xuv 300": "XUV300",
    "xuv 500": "XUV500",
    "xuv 700": "XUV700",
  },
  toyota: {
    // A model of its own, not a Corolla with a trim called Quest.
    "corolla quest": "Corolla Quest",
  },
  volkswagen: {
    "tiguan allspace": "Tiguan Allspace",
    up: "Up",
    "move up": "Up",
    "up move up": "Up",
    "cross up": "Up",
    "high up": "Up",
  },
  "land rover": {
    "discovery sport": "Discovery Sport",
    evoque: "Range Rover Evoque",
    "range rover evoque": "Range Rover Evoque",
    velar: "Range Rover Velar",
    "range rover velar": "Range Rover Velar",
    "range rover sport": "Range Rover Sport",
  },
  mini: {
    countryman: "Countryman",
    "cooper countryman": "Countryman",
    "cooper s countryman": "Countryman",
    "one countryman": "Countryman",
    clubman: "Clubman",
    "cooper clubman": "Clubman",
    "cooper s clubman": "Clubman",
    "cooper s": "Cooper",
  },
  "mercedes benz": {
    ml: "M-Class",
    "m class": "M-Class",
  },
};

/**
 * The model a manufacturer's own designation names, for the two makes that name cars by number.
 *
 * A BMW 218i is a 2 Series and a 520d is a 5 Series: the first digit is the series. A Mercedes-Benz
 * A 180 is an A-Class and a GLA 200 is a GLA: the letters are the model. These are the makers' own
 * naming rules, so reading them is not guessing, and a page that says only "BMW 218i (F45) Active
 * Tourer" still lands on the right model. The designation stays in the trim, because "218i" is
 * what tells a buyer which 2 Series it is.
 */
export function designatedModel(makeName: string, text: string): string | null {
  const make = normaliseKey(makeName);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";

  if (make === "bmw") {
    const series = first.match(/^([1-8])\d{2}[a-z]{0,2}$/i);
    return series ? `${series[1]} Series` : null;
  }

  if (make === "mercedes benz") {
    const joined = `${first}${/^\d/.test(words[1] ?? "") ? (words[1] ?? "") : ""}`;
    const letters = joined.match(
      /^(A|B|C|E|S|G|V|ML|GL|GLA|GLB|GLC|GLE|GLS|CLA|CLS|CLK|SL|SLK|SLC)-?(\d{2,3})[a-z]{0,4}$/i,
    )?.[1];
    if (!letters) return null;
    const upper = letters.toUpperCase();
    if (upper === "ML") return "M-Class";
    if (upper.length === 1 || upper === "GL") return `${upper}-Class`;
    return upper;
  }

  return null;
}

/** The words of a piece of text, each as `normaliseKey` would write it, empty ones dropped. */
function keyWords(text: string): string[] {
  return normaliseKey(text).split(" ").filter(Boolean);
}

/** Whether `words` contains `part` as a run of whole words, and where it starts. */
function indexOfWords(words: string[], part: string[]): number {
  if (part.length === 0 || part.length > words.length) return -1;
  for (let at = 0; at + part.length <= words.length; at += 1) {
    if (part.every((word, offset) => words[at + offset] === word)) return at;
  }
  return -1;
}

/**
 * What is left of a page's title once the make and the year have been taken off it.
 *
 * Titles on this source start with the make written several ways: "Mercedes Benz", "VW",
 * "Volkswagen (VW)" and "Volkswagen VW" all appear, so every leading word that names the make, by
 * its name or by one of its other names, is taken off. "BMW 2018" becomes nothing at all, which is
 * the honest answer.
 */
export function modelTextFromTitle(
  title: string | null,
  makeName: string | null,
  makeAliases: Record<string, string> = {},
): string {
  if (!title) return "";
  let words = title.trim().split(/\s+/).filter(Boolean);

  if (makeName) {
    const make = normaliseKey(makeName);
    const names = [
      make,
      ...Object.entries(makeAliases)
        .filter(([, target]) => normaliseKey(target) === make)
        .map(([alias]) => normaliseKey(alias)),
    ].map((name) => name.split(" "));

    let removed = true;
    while (removed && words.length > 0) {
      removed = false;
      for (const name of names) {
        const head = keyWords(words.slice(0, name.length).join(" "));
        if (head.length === name.length && head.every((word, index) => word === name[index])) {
          words = words.slice(name.length);
          removed = true;
          break;
        }
      }
    }
  }

  return words
    .join(" ")
    .replace(/\b(?:19|20)\d{2}\b\s*$/, "")
    .trim();
}

/** What one piece of text says the model is. */
export type ModelPick = {
  /** The entry Rynet already keeps, when there is one. */
  entry: TaxonomyEntry | null;
  /** Its name, or the name a new entry would be given. */
  name: string;
  /** What the text says after the model, which is trim. */
  residue: string;
  /** True when the name comes from Rynet's list, a known other name or a maker's designation. */
  known: boolean;
};

/**
 * The model one piece of text names: the Model row in the table, or the page's title.
 *
 * In order: a maker's designation ("218i", "A 180"), then the longest run of leading words that is
 * either a model Rynet keeps or one of the other names above, then, only when neither matched, a
 * new name cut from the front of the text at the first word that reads as trim. A leading bracket
 * is an aside and is skipped: "(VW) Move up! 3 Door" is an up.
 */
export function pickModel(
  models: TaxonomyEntry[],
  makeName: string,
  text: string | null | undefined,
): ModelPick | null {
  const cleaned = (text ?? "").trim().replace(/^\([^)]*\)\s*/, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const aliases = MODEL_ALIASES[normaliseKey(makeName)] ?? {};

  const designated = designatedModel(makeName, cleaned);
  if (designated) {
    const entry = findEntry(models, designated, aliases);
    return { entry, name: entry?.name ?? designated, residue: cleaned, known: true };
  }

  for (let take = words.length; take >= 1; take -= 1) {
    const head = words.slice(0, take).join(" ");
    const rest = words.slice(take).join(" ");
    const target = aliases[normaliseKey(head)];

    if (target) {
      const entry = findEntry(models, target);
      const name = entry?.name ?? target;
      // Words of the other name that are not part of the model name are trim: "Cooper S
      // Countryman" is a Countryman whose trim starts "Cooper S".
      const nameWords = keyWords(name);
      const sameName = keyWords(head).join("") === nameWords.join("");
      const extra = sameName
        ? []
        : words.slice(0, take).filter((word) => {
            const key = normaliseKey(word);
            return key.length > 0 && !nameWords.includes(key);
          });
      return { entry, name, residue: [...extra, rest].join(" ").trim(), known: true };
    }

    const entry = findEntry(models, head);
    if (entry) return { entry, name: entry.name, residue: rest, known: true };
  }

  const split = splitModelName(cleaned);
  const name = tidyModelName(split.name);
  if (!name) return null;
  return { entry: null, name, residue: split.trim, known: false };
}

/** What the title says once the model's own words are taken out of it, for the trim. */
export function trimOutside(text: string, modelName: string, fallback: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const keys = words.map((word) => normaliseKey(word));
  const name = keyWords(modelName);
  const at = indexOfWords(keys, name);
  if (at === -1) return fallback;
  return [...words.slice(0, at), ...words.slice(at + name.length)].join(" ").trim();
}

/** The two readings of one car agreed, or one of them said nothing. */
export type ModelChoice =
  | { kind: "pick"; pick: ModelPick; trim: string }
  /** The table and the title name two different models, and nothing says which is right. */
  | { kind: "conflict"; table: ModelPick; title: ModelPick }
  | { kind: "none" };

/**
 * Deciding the model from the two places a page names it.
 *
 * The Model row in the table is picked from a list in the dealership's own admin, and the title is
 * what somebody typed. Most of the time they agree. When one is a fuller name for the other (the
 * table says "Discovery" and the title says "Discovery Sport", which Rynet knows is a model of its
 * own), the fuller one is taken. When the table's model appears anywhere in the title, the table
 * is taken. Otherwise the page contradicts itself, "Q3" in the table and "Q2" in the title, and
 * the answer is not to choose: the car is held back and the dealership is asked which it is.
 */
export function chooseModel(
  table: ModelPick | null,
  title: ModelPick | null,
  titleText: string,
): ModelChoice {
  if (!table && !title) return { kind: "none" };
  if (table && !title) return { kind: "pick", pick: table, trim: table.residue };
  if (title && !table) return { kind: "pick", pick: title, trim: title.residue };
  if (!table || !title) return { kind: "none" };

  const tableKey = keyWords(table.name);
  const titleKey = keyWords(title.name);

  // The same model, however the gap in its name was typed: "X-Trail" in one and "Xtrail" in the
  // other. The table's spelling is kept when neither is on Rynet's list yet, because it is picked
  // from a list rather than typed.
  if (tableKey.join("") === titleKey.join("")) {
    const pick = table.entry ? table : title.entry ? title : table;
    return { kind: "pick", pick, trim: trimOutside(titleText, pick.name, title.residue) };
  }

  if (title.known && indexOfWords(titleKey, tableKey) === 0) {
    return { kind: "pick", pick: title, trim: title.residue };
  }

  if (indexOfWords(keyWords(titleText), tableKey) !== -1) {
    return { kind: "pick", pick: table, trim: trimOutside(titleText, table.name, table.residue) };
  }

  return { kind: "conflict", table, title };
}

/**
 * The model a listing's web address names, but only when Rynet already keeps that model.
 *
 * This is the last resort, for the cars whose table says nothing and whose title is just the make
 * and a year. It never adds a model, because a web address is a slug of a whole sentence and the
 * model cannot be told from the trim inside one: "vw-move-up-3-door" would become a model called
 * "Vw Move". So it only recognises a model Rynet already has, and a car it cannot place is held
 * back for a person to look at.
 */
export function modelFromSlug(
  entries: TaxonomyEntry[],
  slug: string,
  makeSlug: string | null,
): TaxonomyEntry | null {
  let rest = slug.toLowerCase();
  for (const prefix of [makeSlug, "vw"].filter(Boolean) as string[]) {
    if (rest.startsWith(`${prefix}-`)) rest = rest.slice(prefix.length + 1);
  }

  let best: TaxonomyEntry | null = null;
  let bestLength = 0;
  for (const entry of entries) {
    for (const key of [entry.slug, entry.name].filter(Boolean) as string[]) {
      const candidate = normaliseKey(key).replace(/\s+/g, "-");
      if (!candidate) continue;
      if (
        (rest === candidate || rest.startsWith(`${candidate}-`)) &&
        candidate.length > bestLength
      ) {
        best = entry;
        bestLength = candidate.length;
      }
    }
  }
  return best;
}
