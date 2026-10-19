import { formatKm, formatRand } from "@/lib/format";
import type { ParsedQuery, QueryPart } from "@/lib/query-parse";

import type { ResolvedFilters, StockRow } from "./match";
import { matches } from "./match";
import type { Taxonomy } from "./stock";

/**
 * What the search box says back, and the one change that would find more.
 *
 * The home page search answers every keystroke with three things: a chip per thing it understood
 * (in its own words, with what the buyer typed when it read a slip), the words it could not use,
 * and up to three "close calls" when the answer is thin. A close call is a rewrite of the buyer's
 * own sentence ("under R 200 000" becomes "under R 250 000"), never a hidden filter, so following
 * one leaves a sentence /cars reads exactly the same way.
 *
 * Pure and unit tested (understand.test.ts). The caller counts each candidate through the same
 * resolve and match every search uses, so the "+3" on a close call is the number /cars shows.
 */

export type SaidBack = {
  key: QueryPart["key"];
  label: string;
  /** A second line: what a monthly budget reaches, or what the buyer actually typed. */
  hint: string | null;
  /** The words in the sentence this came from, for removing it. */
  phrase: string;
  /** Other words the chip stands for: "vw" in "vw polo", folded into the one Volkswagen Polo chip. */
  also: string[];
  /** A model that exists but that no dealership lists right now. */
  unstocked: boolean;
};

export type Candidate = { label: string; text: string };

/** Plain spaces, so a rewritten sentence reads like one a person typed. */
const plain = (value: string) => value.replace(/[  ]/g, " ");
const rand = (value: number) => plain(formatRand(value));
const km = (value: number) => plain(formatKm(value));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces the words a part came from, wherever they sit in what the buyer typed.
 *
 * A part's phrase is the normalised form ("under r250000", "vw"), while the box may say
 * "Under R 250 000" or "VW,". So the match allows any case, spaces or commas inside a number and
 * a space after the R, and punctuation where the normaliser saw a space.
 */
export function replacePhrase(text: string, phrase: string, replacement: string): string {
  if (!phrase) return text;
  const loose = escapeRegExp(phrase)
    .replace(/(\d)(?=\d)/g, "$1[\\s,\\u00a0\\u202f]?")
    .replace(/\br(?=\d)/g, "r\\s?")
    .replace(/\s+/g, "[\\s,.!?\\-]+");
  const re = new RegExp(`(^|[^a-z0-9])${loose}(?![a-z0-9])`, "i");
  const next = text.replace(
    re,
    (_, lead: string) => `${lead}${replacement ? ` ${replacement} ` : " "}`,
  );
  // Tidy what the cut leaves: no space before a comma, no doubled or dangling punctuation.
  return next
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])(?=[,.!?])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.!?]+|[\s,]+$/g, "")
    .trim();
}

const SORT_LABEL: Record<string, string> = {
  "price-asc": "Cheapest first",
  newest: "Newest first",
  mileage: "Lowest mileage first",
};

/** One chip per understood part, in the order the buyer said them. */
export function sayBack(parsed: ParsedQuery, taxonomy: Taxonomy, rows: StockRow[]): SaidBack[] {
  const name = (list: { slug: string; name: string }[], slug: unknown) =>
    list.find((term) => term.slug === slug)?.name ?? String(slug);

  const chips = parsed.parts.map((part): SaidBack => {
    const base = {
      key: part.key,
      phrase: part.phrase,
      also: [] as string[],
      hint: part.typed ? `you typed "${part.typed}"` : null,
      unstocked: false,
    };
    switch (part.key) {
      case "make":
        return { ...base, label: name(taxonomy.makes, part.value) };
      case "model": {
        const model = taxonomy.models.find((term) => term.slug === part.value);
        const make = taxonomy.makes.find((term) => term.id === model?.make);
        const label = [make?.name, model?.name ?? String(part.value)].filter(Boolean).join(" ");
        const stocked = Boolean(model && rows.some((row) => row.model === model.id));
        return stocked
          ? { ...base, label }
          : { ...base, label: `No ${label} listed yet`, unstocked: true };
      }
      case "body":
        return { ...base, label: name(taxonomy.bodies, part.value) };
      case "fuel":
        return { ...base, label: name(taxonomy.fuels, part.value) };
      case "transmission":
        return { ...base, label: name(taxonomy.transmissions, part.value) };
      case "city":
        return { ...base, label: `In ${name(taxonomy.cities, part.value)}` };
      case "province":
        return { ...base, label: `In ${name(taxonomy.provinces, part.value)}` };
      case "maxPrice":
        return { ...base, label: `Under ${rand(Number(part.value))}` };
      case "minPrice":
        return { ...base, label: `Over ${rand(Number(part.value))}` };
      case "monthly":
        return {
          ...base,
          label: `About ${rand(Number(part.value))} a month`,
          // Rounded down, so the hint never promises a car the budget does not reach.
          hint: parsed.monthlyCeiling
            ? `cars up to ${rand(Math.floor(parsed.monthlyCeiling / 1000) * 1000)}`
            : null,
        };
      case "year":
        return { ...base, label: `${part.value} models` };
      case "minYear":
        return { ...base, label: `${part.value} or newer` };
      case "maxMileage":
        return { ...base, label: `Under ${km(Number(part.value))}` };
      default:
        return { ...base, label: SORT_LABEL[String(part.value)] ?? "Sorted" };
    }
  });

  /*
   * "VW Polo" is one thing, not two. A make chip beside a model chip of the same make folds into
   * it, and removing the model chip removes both words.
   */
  const model = parsed.parts.find((part) => part.key === "model");
  const make = parsed.parts.find((part) => part.key === "make");
  if (model && make) {
    const term = taxonomy.models.find((t) => t.slug === model.value);
    const makeTerm = taxonomy.makes.find((t) => t.slug === make.value);
    if (term && makeTerm && term.make === makeTerm.id) {
      const modelChip = chips.find((chip) => chip.key === "model");
      modelChip?.also.push(make.phrase);
      return chips.filter((chip) => chip.key !== "make");
    }
  }
  return chips;
}

/** Rounded up to a step, so a stretch reads like a number a person would say. */
const ceilTo = (value: number, step: number) => Math.ceil(value / step) * step;

/**
 * The rewrites worth counting, most specific first: stretch a ceiling to the nearest car past
 * it, then let go of one thing at a time. Each is a sentence; the caller counts it and keeps the
 * ones that actually find more.
 */
export function closeCallCandidates(
  text: string,
  parsed: ParsedQuery,
  filters: ResolvedFilters,
  rows: StockRow[],
  taxonomy: Taxonomy,
  monthlyFor?: (price: number) => number | null,
): Candidate[] {
  const out: Candidate[] = [];
  const part = (key: QueryPart["key"]) => parsed.parts.find((p) => p.key === key);
  const nearest = (
    loosened: ResolvedFilters,
    above: (row: StockRow) => boolean,
    by: (row: StockRow) => number,
  ) => rows.filter((row) => matches(row, loosened) && above(row)).sort((a, b) => by(a) - by(b))[0];

  const monthly = part("monthly");
  const ceiling = part("maxPrice") ?? monthly;
  if (ceiling && filters.maxPrice !== null) {
    const cap = filters.maxPrice;
    const next = nearest(
      { ...filters, maxPrice: null },
      (row) => row.price > cap,
      (row) => row.price,
    );
    if (next) {
      const price = ceilTo(next.price, 10_000);
      const perMonth = ceiling === monthly && monthlyFor ? monthlyFor(price) : null;
      if (perMonth) {
        const amount = ceilTo(perMonth, 100);
        out.push({
          label: `Stretch to ${rand(amount)} a month`,
          text: replacePhrase(text, ceiling.phrase, `${rand(amount)} a month`),
        });
      } else if (ceiling !== monthly) {
        out.push({
          label: `Stretch to ${rand(price)}`,
          text: replacePhrase(text, ceiling.phrase, `under ${rand(price)}`),
        });
      }
    }
  }

  const mileage = part("maxMileage");
  if (mileage && filters.maxMileage !== null) {
    const cap = filters.maxMileage;
    const next = nearest(
      { ...filters, maxMileage: null },
      (row) => row.mileage > cap,
      (row) => row.mileage,
    );
    if (next) {
      const limit = ceilTo(next.mileage, 10_000);
      out.push({
        label: `Allow up to ${km(limit)}`,
        text: replacePhrase(text, mileage.phrase, `under ${km(limit)}`),
      });
    }
  }

  const minYear = part("minYear");
  if (minYear && filters.minYear !== null) {
    const from = filters.minYear;
    const older = nearest(
      { ...filters, minYear: null },
      (row) => row.year < from,
      (row) => -row.year,
    );
    if (older) {
      out.push({
        label:
          older.year === from - 1 ? `Include ${older.year} models` : `Go back to ${older.year}`,
        text: replacePhrase(text, minYear.phrase, `${older.year} or newer`),
      });
    }
  }

  // A model with nothing under it may still have its make on the floor: "Any Toyota".
  const model = part("model");
  if (model) {
    const term = taxonomy.models.find((t) => t.slug === model.value);
    const make = taxonomy.makes.find((t) => t.id === term?.make);
    if (make && !part("make")) {
      out.push({
        label: `Any ${make.name}, not just the ${term?.name}`,
        text: replacePhrase(text, model.phrase, make.name),
      });
    } else if (make) {
      out.push({
        label: `Any ${make.name}, not just the ${term?.name}`,
        text: replacePhrase(text, model.phrase, ""),
      });
    }
  }

  const DROP: [QueryPart["key"], string][] = [
    ["transmission", "gearbox"],
    ["fuel", "fuel"],
    ["body", "body type"],
    ["year", "year"],
    ["city", "town"],
    ["province", "province"],
    ["make", "make"],
    ["minPrice", "price"],
  ];
  const chips = sayBack(parsed, taxonomy, rows);
  for (const [key, what] of DROP) {
    const p = part(key);
    if (!p) continue;
    const chip = chips.find((c) => c.key === key);
    const label =
      key === "year"
        ? `Any year, not just ${p.value}`
        : `Any ${what}, not just ${chip?.label ?? p.phrase}`;
    out.push({ label, text: replacePhrase(text, p.phrase, "") });
  }

  return out.filter((c, i) => c.text && out.findIndex((x) => x.text === c.text) === i);
}
