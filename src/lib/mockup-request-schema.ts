import { z } from "zod";

/**
 * A dealership asking for a free homepage mockup, from /digital/free-mockup.
 *
 * Separate from the action because a `"use server"` module may export nothing but async functions
 * (see agency-enquiry-schema.ts for what happens otherwise).
 *
 * As few questions as the work needs. The website is optional because some dealerships only have
 * a portal profile or a Facebook page, and "where your stock is listed" covers them.
 */

export const MOCKUP_CONSENT_WORDING =
  "I agree that Rynet may use these details to make my dealership a website mockup and to contact me about it.";

export const mockupRequestSchema = z.object({
  dealership: z.string().trim().min(2, "The name of the dealership.").max(160),
  website: z.string().trim().max(300).optional(),
  name: z.string().trim().min(2, "Your name, so we know who to send it to.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{8,19}$/, "A phone number we can call or WhatsApp."),
  email: z
    .union([z.literal(""), z.string().trim().email("That email address looks wrong.")])
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  consent: z.literal(true, { message: "Tick this so we may make it and contact you." }),
  hp: z.string().optional(),
  elapsedMs: z.coerce.number().optional(),
});

export type MockupRequest = z.infer<typeof mockupRequestSchema>;

export type MockupRequestState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export function mockupMessage(
  data: Pick<MockupRequest, "dealership" | "website" | "notes">,
): string {
  return [
    `Dealership: ${data.dealership}`,
    `Website: ${data.website?.trim() || "none given"}`,
    "",
    data.notes?.trim() || "No notes.",
  ].join("\n");
}
