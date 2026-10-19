"use server";

import config from "@payload-config";
import { getPayload } from "payload";

import { matches } from "@/components/search/match";
import { paramsFromSearch, readState } from "@/components/search/params";
import { getRows, getTaxonomy, resolveSearch } from "@/components/search/stock";
import { closeCallCandidates, type SaidBack, sayBack } from "@/components/search/understand";
import { defaultEstimate } from "@/lib/finance";

/**
 * The home page search, answered as the buyer types.
 *
 * It reads the words exactly as /cars reads `?q=`: the same parser, the same resolve, the same
 * predicate over the same cached rows. So the count on the button is the count /cars shows when
 * the button is pressed, and the "+3" on a close call is the count its rewritten sentence finds.
 *
 * Live stock only, which is public, and nothing is written. Input is capped, and anything the
 * parser does not know is handed back rather than acted on.
 *
 * This file may export nothing but async functions: a "use server" module that exports a value
 * stops Next creating the action reference (see src/app/actions/enquiry.ts). The result type
 * lives in floor-types.ts for the same reason.
 */

import type { Understood } from "./floor-types";

const MAX_LENGTH = 200;
/** Close calls are only worth offering while the answer is thin. */
const THIN = 12;

export async function understandSearch(text: string): Promise<Understood | null> {
  if (typeof text !== "string" || text.length > MAX_LENGTH) return null;
  const q = text.trim();

  try {
    const [rows, taxonomy] = await Promise.all([getRows(), getTaxonomy()]);
    const resolve = async (words: string) => {
      const state = readState(paramsFromSearch(new URLSearchParams(words ? { q: words } : {})));
      const resolved = await resolveSearch(state, rows, taxonomy);
      return { resolved, hits: rows.filter((row) => matches(row, resolved.filters)) };
    };

    const { resolved, hits } = await resolve(q);
    const parsed = resolved.query?.parsed ?? null;

    let disclaimer: string | null = null;
    let monthlyFor: ((price: number) => number | null) | undefined;
    if (parsed?.monthly) {
      const payload = await getPayload({ config });
      const defaults = await payload.findGlobal({ slug: "finance-defaults" });
      disclaimer = typeof defaults.disclaimer === "string" ? defaults.disclaimer : null;
      monthlyFor = (price) => {
        try {
          return defaultEstimate(price, defaults).monthlyInstalment;
        } catch {
          return null;
        }
      };
    }

    const calls: Understood["calls"] = [];
    if (parsed && q && hits.length < THIN) {
      const candidates = closeCallCandidates(
        q,
        parsed,
        resolved.filters,
        rows,
        taxonomy,
        monthlyFor,
      );
      for (const candidate of candidates.slice(0, 8)) {
        if (calls.length >= 3) break;
        const found = (await resolve(candidate.text)).hits.length;
        if (found > hits.length) calls.push({ ...candidate, gain: found - hits.length });
      }
    }

    const chips: SaidBack[] = parsed ? sayBack(parsed, taxonomy, rows) : [];

    return {
      text: q,
      total: hits.length,
      all: rows.length,
      ids: hits.slice(0, 2000).map((row) => row.id),
      chips,
      unmatched: parsed?.unmatched ?? [],
      nothing: resolved.filters.nothing,
      calls,
      disclaimer,
      href: q ? `/cars?q=${encodeURIComponent(q)}` : "/cars",
    };
  } catch {
    return null;
  }
}
