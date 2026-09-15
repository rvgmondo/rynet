"use server";

import { paramsFromSearch, readState } from "./params";
import { countSearch } from "./stock";

/**
 * The live count behind "Show 42 cars" on the filter form.
 *
 * It reads a query string exactly as /cars would read it, so the number on the button is the
 * number of cars the buyer lands on. It only counts live stock, which is public, and it writes
 * nothing. Input is capped and every value is validated by readState, so a crafted string can
 * only ever ask a narrower question.
 *
 * This file may export nothing but async functions: a "use server" module that exports a value
 * stops Next creating the action reference (see src/app/actions/enquiry.ts).
 */
export async function countCars(query: string): Promise<number | null> {
  if (typeof query !== "string" || query.length > 2000) return null;
  try {
    return await countSearch(readState(paramsFromSearch(new URLSearchParams(query))));
  } catch {
    return null;
  }
}
