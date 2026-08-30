import { z } from "zod";

/**
 * The enquiry contract.
 *
 * In its own file, not in the server action, because **a "use server" module may only
 * export async functions.** Exporting a Zod schema alongside the action stopped Next from
 * creating the action reference, so the form silently fell back to a plain HTML POST: the
 * page navigated, the dialog closed, and no lead was written. It looked like a submission
 * that quietly did nothing, which is the worst way for this particular thing to fail.
 *
 * One schema, used by the server action as the control and available to the client form as
 * a convenience, so the two can never drift.
 */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(120),
  email: z.email("That email address does not look right.").max(200),
  phone: z
    .string()
    .trim()
    .min(9, "A phone number the dealership can reach you on.")
    .max(20)
    .regex(/^[0-9+()\-\s]+$/, "Digits, spaces and + only."),
  message: z.string().trim().max(2000).optional(),
  type: z.enum(["enquiry", "test_drive", "finance", "callback"]).default("enquiry"),
  vehicleRef: z.string().trim().max(20).optional(),
  consent: z.literal(true, {
    message: "We need your permission to pass your details to the dealership.",
  }),
  /** Never shown to a person. Anything in it is a bot. */
  website: z.string().max(0).optional(),
  /** Milliseconds since the form rendered. */
  elapsedMs: z.coerce.number().int().nonnegative().optional(),
});

export type EnquiryInput = z.input<typeof enquirySchema>;

export type EnquiryState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };
