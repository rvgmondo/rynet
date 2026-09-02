import { z } from "zod";

/**
 * The agency qualification contract.
 *
 * Separate file from the action for the same reason as `enquiry-schema.ts`: a `"use server"`
 * module may export nothing but async functions, and exporting a schema alongside the action
 * stops Next creating the action reference. The form then falls back to a plain HTML POST,
 * the page navigates, and no lead is written. It looks exactly like a submission that
 * worked. That already happened once on this project and is not going to happen twice.
 *
 * The fields are a qualification, not a contact form. Every one of them changes what we say
 * on the call, which is the test for whether a field earns its place: a question whose
 * answer changes nothing is a question that should not be asked.
 */

export const DEALERSHIP_SIZES = [
  { value: "single", label: "One branch" },
  { value: "multi", label: "Two to five branches" },
  { value: "group", label: "A group, more than five" },
  { value: "starting", label: "Opening soon, not trading yet" },
] as const;

export const AGENCY_INTERESTS = [
  { value: "website", label: "Website" },
  { value: "feeds", label: "Stock feeds" },
  { value: "paid_media", label: "Paid advertising" },
  { value: "seo", label: "Search and local" },
  { value: "photography", label: "Photography and video" },
  { value: "crm", label: "Lead handling" },
  { value: "reporting", label: "Reporting" },
  { value: "unsure", label: "Not sure, that is what the review is for" },
] as const;

export const URGENCIES = [
  { value: "now", label: "Now, something is broken" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "Sometime this year" },
  { value: "looking", label: "Just looking at options" },
] as const;

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [string, ...string[]];

export const agencyEnquirySchema = z.object({
  // Step one. Deliberately three fields: a first step that is a wall of inputs is a first
  // step nobody finishes.
  dealership: z.string().trim().min(2, "The name of the dealership.").max(160),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine(
      (value) => !value || /^([a-z]+:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value),
      "That does not look like a web address. Leave it blank if you do not have one yet.",
    ),
  size: z.enum(values(DEALERSHIP_SIZES), { message: "Pick the closest one." }),

  // Step two.
  interests: z
    .array(z.enum(values(AGENCY_INTERESTS)))
    .min(1, "Pick at least one, or choose the last option.")
    .max(AGENCY_INTERESTS.length),
  urgency: z.enum(values(URGENCIES), { message: "Pick the closest one." }),
  context: z.string().trim().max(2000).optional(),

  // Step three.
  name: z.string().trim().min(2, "Your name.").max(120),
  role: z.string().trim().max(120).optional(),
  email: z.email("That email address does not look right.").max(200),
  phone: z
    .string()
    .trim()
    .min(9, "A number we can reach you on.")
    .max(20)
    .regex(/^[0-9+()\-\s]+$/, "Digits, spaces and + only."),

  consent: z.literal(true, {
    message: "We need your permission to reply to this.",
  }),

  /** Never shown to a person. Anything in it is a bot. */
  hp: z.string().max(0).optional(),
  /** Milliseconds since the form rendered, stamped on submit rather than on render. */
  elapsedMs: z.coerce.number().int().nonnegative().optional(),
});

export type AgencyEnquiryInput = z.input<typeof agencyEnquirySchema>;

export type AgencyEnquiryState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** Which step each field belongs to, so a server error can send the person back to it. */
export const FIELD_STEP: Record<string, number> = {
  dealership: 0,
  website: 0,
  size: 0,
  interests: 1,
  urgency: 1,
  context: 1,
  name: 2,
  role: 2,
  email: 2,
  phone: 2,
  consent: 2,
};
