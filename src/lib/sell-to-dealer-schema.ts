import { z } from "zod";

/**
 * The sell-to-a-dealer contract.
 *
 * Its own file, not the server action, because a `"use server"` module may export nothing but
 * async functions. Exporting a schema alongside the action stops Next creating the action
 * reference, the form falls back to a plain HTML POST, and nothing is written while the page
 * looks like it worked. That has already happened once on this project.
 *
 * WHAT THIS DELIBERATELY DOES NOT COLLECT:
 *
 * **A price.** Not an asking price, not an expectation, and the page shows no estimate. Rynet
 * has no licensed valuation source, so any figure it produced would be invented, and a person
 * makes a financial decision on this one. Dealerships make the offers.
 *
 * **A registration number or VIN.** Neither changes an opening offer, and both are the pieces
 * of a vehicle's identity worth stealing. Asking for them on a public form would collect
 * exactly what we refuse to publish elsewhere.
 */

export const CURRENT_YEAR = 2026;
export const OLDEST_YEAR = 1970;

/**
 * The choice lists.
 *
 * Each is declared twice on purpose: a literal tuple of values, and the labelled options the
 * form renders. `satisfies` ties them together, so adding an option without adding its value
 * is a type error rather than a select that silently rejects one of its own choices.
 *
 * The tuples exist because `z.enum` needs literal types to infer a literal union, and a
 * `.map()` over the options widens everything to `string`. That widening then fails against
 * Payload's generated field types, which is how this was caught.
 */
type Option<T extends string> = { value: T; label: string };

export const TRANSMISSION_VALUES = ["manual", "automatic"] as const;
export const TRANSMISSIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
] as const satisfies readonly Option<(typeof TRANSMISSION_VALUES)[number]>[];

export const CONDITION_VALUES = ["excellent", "good", "fair", "poor"] as const;
export const CONDITIONS = [
  { value: "excellent", label: "Excellent, nothing needs doing" },
  { value: "good", label: "Good, a few marks" },
  { value: "fair", label: "Fair, needs some work" },
  { value: "poor", label: "Poor, or not running" },
] as const satisfies readonly Option<(typeof CONDITION_VALUES)[number]>[];

export const SERVICE_HISTORY_VALUES = ["full", "partial", "none"] as const;
export const SERVICE_HISTORIES = [
  { value: "full", label: "Full, with the book" },
  { value: "partial", label: "Partial" },
  { value: "none", label: "None" },
] as const satisfies readonly Option<(typeof SERVICE_HISTORY_VALUES)[number]>[];

export const FINANCE_VALUES = ["none", "outstanding", "unsure"] as const;
export const FINANCE_STATES = [
  { value: "none", label: "Paid off" },
  { value: "outstanding", label: "Still on finance" },
  { value: "unsure", label: "Not sure" },
] as const satisfies readonly Option<(typeof FINANCE_VALUES)[number]>[];

export const sellToDealerSchema = z.object({
  // Step one. The car, and nothing personal, so the first screen asks nothing a person would
  // hesitate over.
  make: z.string().trim().min(1, "Which make?").max(60),
  model: z.string().trim().min(1, "Which model?").max(80),
  modelYear: z.coerce
    .number()
    .int()
    .min(OLDEST_YEAR, `Year must be ${OLDEST_YEAR} or later.`)
    .max(CURRENT_YEAR + 1, "That year is in the future."),
  mileageKm: z.coerce
    .number()
    .int()
    .min(0, "Mileage cannot be negative.")
    .max(2_000_000, "That mileage does not look right."),

  // Step two. Condition and papers.
  transmission: z.enum(TRANSMISSION_VALUES, { message: "Pick one." }),
  condition: z.enum(CONDITION_VALUES, { message: "Pick the closest one." }),
  serviceHistory: z.enum(SERVICE_HISTORY_VALUES, { message: "Pick one." }),
  finance: z.enum(FINANCE_VALUES, { message: "Pick one." }),
  notes: z.string().trim().max(2000).optional(),

  // Step three. Where the car is and how to reach the seller.
  province: z.string().trim().min(1, "Which province is the car in?"),
  city: z.string().trim().min(2, "Which town or city?").max(120),
  name: z.string().trim().min(2, "Your name.").max(120),
  email: z.email("That email address does not look right.").max(200),
  phone: z
    .string()
    .trim()
    .min(9, "A number the dealership can reach you on.")
    .max(20)
    .regex(/^[0-9+()\-\s]+$/, "Digits, spaces and + only."),

  consent: z.literal(true, {
    message: "We need your permission before we can send your details to any dealership.",
  }),

  /** Never shown to a person. Anything in it is a bot. */
  hp: z.string().max(0).optional(),
  /** Milliseconds since the form rendered, stamped on submit rather than at render. */
  elapsedMs: z.coerce.number().int().nonnegative().optional(),
});

export type SellToDealerInput = z.input<typeof sellToDealerSchema>;

export type SellToDealerState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** Which step each field belongs to, so a server error returns to the right screen. */
export const FIELD_STEP: Record<string, number> = {
  make: 0,
  model: 0,
  modelYear: 0,
  mileageKm: 0,
  transmission: 1,
  condition: 1,
  serviceHistory: 1,
  finance: 1,
  notes: 1,
  province: 2,
  city: 2,
  name: 2,
  email: 2,
  phone: 2,
  consent: 2,
};

/**
 * The most dealerships one submission is ever sent to.
 *
 * A number rather than "some dealerships", because POPIA consent has to be specific enough to
 * be meaningful, and because a seller who agreed to "some" and then took nine phone calls was
 * not told the truth. It appears in the consent wording, on the page, and is enforced when the
 * lead is distributed.
 */
export const MAX_DEALERSHIPS = 5;
