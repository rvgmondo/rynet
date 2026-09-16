import type { ListCondition } from "./admin-links";

/**
 * Small pure helpers behind the admin list cells and quick filters.
 *
 * No imports from Payload at run time, so the client cells can use them and the tests can run
 * them without a server.
 */

export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

export type WhereShape = Record<string, unknown>;

/**
 * A select option's label, read as plain text. Labels are a string or a record of languages;
 * anything else falls back to the stored value, so a badge always carries words.
 */
export function optionLabel(options: unknown, value: unknown, language = "en"): string {
  const fallback = value === null || value === undefined ? "" : String(value);
  if (!Array.isArray(options)) return fallback;
  for (const option of options) {
    if (typeof option === "string") {
      if (option === value) return option;
      continue;
    }
    if (!option || typeof option !== "object") continue;
    const record = option as { value?: unknown; label?: unknown };
    if (record.value !== value) continue;
    const label = record.label;
    if (typeof label === "string" && label.length > 0) return label;
    if (label && typeof label === "object") {
      const byLanguage = label as Record<string, unknown>;
      const chosen = byLanguage[language] ?? byLanguage.en ?? Object.values(byLanguage)[0];
      if (typeof chosen === "string" && chosen.length > 0) return chosen;
    }
    return fallback;
  }
  return fallback;
}

/**
 * The `where` a quick filter sets, in the shape Payload's filter panel reads back
 * (`or[0].and[n]`), so the panel shows what is applied and a person can change or clear it.
 * No conditions means no filter at all.
 */
export function quickFilterWhere(conditions: readonly ListCondition[]): WhereShape {
  if (conditions.length === 0) return {};
  return {
    or: [
      {
        and: conditions.map((condition) => ({
          [condition.field]: {
            [condition.operator]: Array.isArray(condition.value)
              ? [...condition.value]
              : condition.value,
          },
        })),
      },
    ],
  };
}

/**
 * Every value as a string, and empty containers removed, because a filter read back from the
 * address bar has "true" and "5" where the button that set it had true and 5.
 */
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(normalise).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = normalise((value as Record<string, unknown>)[key]);
      if (item !== undefined) out[key] = item;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

/** Whether two list filters ask for the same thing. */
export function sameWhere(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalise(a) ?? null) === JSON.stringify(normalise(b) ?? null);
}

type TradeIn = { make?: unknown; model?: unknown; modelYear?: unknown } | null | undefined;

/**
 * What an enquiry is about, in a few words: the car it was sent from, the car a seller wants to
 * sell, or Rynet Digital. `carTitle` is the linked car's name once it has loaded.
 */
export function leadAbout(row: {
  type?: unknown;
  vehicle?: unknown;
  tradeIn?: TradeIn;
  carTitle?: string | null;
}): string | null {
  if (row.type === "agency_enquiry") return "Rynet Digital";
  if (row.type === "trade_in") {
    const trade = row.tradeIn ?? {};
    const name = [trade.modelYear, trade.make, trade.model]
      .map((part) => (typeof part === "number" ? String(part) : part))
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim())
      .join(" ");
    return name ? `Selling a ${name}` : "Selling a car";
  }
  if (row.carTitle) return row.carTitle;
  return null;
}

/** A whole number grouped in threes with no-break spaces: `1 204`. */
export function formatCount(value: number): string {
  return Math.round(value)
    .toLocaleString("en-ZA")
    .replace(/[,\s\u202f]/g, "\u00a0");
}
