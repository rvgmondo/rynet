/**
 * The search box, which has to understand how South Africans actually type.
 *
 * A buyer types "bakkie under 300" or "vw polo cape town", not a structured query. Before
 * this existed the box on the 404 page sent `?q=` to /cars and /cars ignored it entirely,
 * so the search box did nothing at all.
 *
 * The approach is deliberately not a text index. Every taxonomy on this platform already
 * carries an `aliases` array, seeded with what the country actually says: a bakkie is a
 * pickup, a combi is an MPV, GP is Gauteng, PTA is Pretoria. So a query resolves into real
 * filters against real taxonomy rows, which means the result is a normal faceted URL that
 * is shareable, crawlable, and identical to what the rail would have produced. A free-text
 * index would produce a result set nothing else on the site can reproduce.
 *
 * Everything it does not understand is handed back in `unmatched`, and the page says so.
 * Silently dropping half of what someone typed is how a search box loses trust.
 */

export type Term = {
  name: string;
  slug: string;
  aliases?: (string | null)[] | null;
};

export type Taxonomies = {
  makes: Term[];
  models: Term[];
  bodyTypes: Term[];
  fuelTypes: Term[];
  transmissions: Term[];
  provinces: Term[];
  cities: Term[];
};

export type ParsedQuery = {
  make?: string;
  model?: string;
  body?: string;
  fuel?: string;
  transmission?: string;
  province?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  /** What was understood, in the buyer's own words, so the page can say it back to them. */
  matched: string[];
  /** What was not. Shown rather than swallowed. */
  unmatched: string[];
};

/**
 * Category order decides who wins when the same phrase appears in two taxonomies.
 *
 * City sits ABOVE province deliberately. "Cape Town" is seeded as an alias of the Western
 * Cape as well as being a city in its own right, and "PTA" is an alias of both Gauteng and
 * Pretoria. In both cases the buyer means the town, so the more specific taxonomy wins and
 * the province is then dropped as redundant.
 */
const ORDER = [
  ["make", "makes"],
  ["model", "models"],
  ["body", "bodyTypes"],
  ["fuel", "fuelTypes"],
  ["transmission", "transmissions"],
  ["city", "cities"],
  ["province", "provinces"],
] as const;

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A rand figure the way it gets typed.
 *
 * "300" in a price phrase means three hundred thousand, because nobody shopping for a car
 * means three hundred rand. "300k" and "300 000" mean the same thing. Anything already
 * above 10 000 is taken literally.
 */
function toRand(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "");
  const hasK = /k$/.test(cleaned);
  const value = Number.parseFloat(cleaned.replace(/k$/, ""));
  if (!Number.isFinite(value) || value <= 0) return null;

  if (hasK) return Math.round(value * 1000);
  if (value < 1000) return Math.round(value * 1000);
  return Math.round(value);
}

const CEILING_WORDS = "under|below|less than|up to|max|maximum|cheaper than";
const FLOOR_WORDS = "over|above|more than|from|at least|min|minimum";
const AMOUNT = "r?\\s?(\\d[\\d\\s.]*k?)";

/**
 * Pulls price phrases out and returns the text with them removed.
 *
 * Removing them matters as much as reading them: leaving "under 300" in the string means
 * "under" then goes looking for a make called under.
 */
export function extractPrice(text: string): {
  rest: string;
  minPrice?: number;
  maxPrice?: number;
  matched: string[];
} {
  let rest = text;
  const matched: string[] = [];
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  const ceiling = new RegExp(`\\b(?:${CEILING_WORDS})\\s+${AMOUNT}`, "i");
  const floor = new RegExp(`\\b(?:${FLOOR_WORDS})\\s+${AMOUNT}`, "i");

  const ceilingHit = rest.match(ceiling);
  if (ceilingHit?.[1]) {
    const value = toRand(ceilingHit[1]);
    if (value) {
      maxPrice = value;
      matched.push(ceilingHit[0].trim());
      rest = rest.replace(ceilingHit[0], " ");
    }
  }

  const floorHit = rest.match(floor);
  if (floorHit?.[1]) {
    const value = toRand(floorHit[1]);
    if (value) {
      minPrice = value;
      matched.push(floorHit[0].trim());
      rest = rest.replace(floorHit[0], " ");
    }
  }

  return { rest: rest.replace(/\s+/g, " ").trim(), minPrice, maxPrice, matched };
}

/** Every string that should resolve to this taxonomy row, longest first. */
function phrasesFor(term: Term): string[] {
  return [term.name, ...(term.aliases ?? [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalise)
    .filter(Boolean);
}

export function parseQuery(raw: string | undefined | null, taxonomies: Taxonomies): ParsedQuery {
  const result: ParsedQuery = { matched: [], unmatched: [] };
  if (!raw || !raw.trim()) return result;

  const price = extractPrice(normalise(raw));
  result.minPrice = price.minPrice;
  result.maxPrice = price.maxPrice;
  result.matched.push(...price.matched);

  // Words are consumed as they are claimed, so "Golf GTI" cannot match a model and then let
  // the same words match again as something else.
  let tokens = price.rest.split(" ").filter(Boolean);

  /*
   * Longest phrase first, across every category at once. "Western Cape" has to beat "cape",
   * and "Double Cab" has to beat "cab", regardless of which taxonomy each sits in. Sorting
   * candidates by word count and only then by category order is what makes that true.
   */
  type Candidate = { key: keyof ParsedQuery; slug: string; phrase: string[]; rank: number };
  const candidates: Candidate[] = [];

  ORDER.forEach(([key, bucket], rank) => {
    for (const term of taxonomies[bucket] ?? []) {
      for (const phrase of phrasesFor(term)) {
        candidates.push({
          key: key as keyof ParsedQuery,
          slug: term.slug,
          phrase: phrase.split(" "),
          rank,
        });
      }
    }
  });

  candidates.sort((a, b) => b.phrase.length - a.phrase.length || a.rank - b.rank);

  for (const candidate of candidates) {
    if (result[candidate.key] !== undefined) continue;

    for (let i = 0; i + candidate.phrase.length <= tokens.length; i += 1) {
      const window = tokens.slice(i, i + candidate.phrase.length);
      if (window.join(" ") !== candidate.phrase.join(" ")) continue;

      (result[candidate.key] as unknown) = candidate.slug;
      result.matched.push(window.join(" "));
      tokens = [...tokens.slice(0, i), ...tokens.slice(i + candidate.phrase.length)];
      break;
    }
  }

  // A city already tells us the province, so keeping both would filter twice for one fact.
  if (result.city) result.province = undefined;

  result.unmatched = tokens;
  return result;
}
