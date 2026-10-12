import { z } from "zod";

/**
 * A dealership putting its hand up to list on Rynet, from /list-your-stock.
 *
 * Separate from the action because a `"use server"` module may export nothing but async
 * functions (see agency-enquiry-schema.ts for what happens otherwise).
 *
 * Five questions and no more. Everything else, the address, the CIPC number, the stock itself, is
 * collected by staff on the onboarding desk once somebody has spoken to them. A sign-up form that
 * asks for a registration number is a sign-up form a dealer principal closes.
 */

export const DEALER_SIGNUP_CONSENT_WORDING =
  "I agree that Rynet may use these details to contact me about listing this dealership on Rynet.";

export const STOCK_SIZES = [
  { value: "under_20", label: "Fewer than 20 cars" },
  { value: "20_50", label: "20 to 50 cars" },
  { value: "50_150", label: "50 to 150 cars" },
  { value: "over_150", label: "More than 150 cars" },
] as const;

const sizes = STOCK_SIZES.map((size) => size.value) as [string, ...string[]];

export const dealerSignupSchema = z.object({
  dealership: z.string().trim().min(2, "The name of the dealership.").max(160),
  name: z.string().trim().min(2, "Your name, so we know who to ask for.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{8,19}$/, "A phone number we can call or WhatsApp."),
  email: z
    .union([z.literal(""), z.string().trim().email("That email address looks wrong.")])
    .optional(),
  website: z.string().trim().max(200).optional(),
  town: z.string().trim().min(2, "The town you trade in.").max(80),
  stock: z.enum(sizes, { message: "Roughly how many cars you have." }),
  consent: z.literal(true, { message: "Tick this so we may contact you." }),
  hp: z.string().optional(),
  elapsedMs: z.coerce.number().optional(),
});

export type DealerSignup = z.infer<typeof dealerSignupSchema>;

export type DealerSignupState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/**
 * The sign-up, written into the lead's message in a fixed shape.
 *
 * The onboarding desk reads it back with `readSignup` to fill in its form, so staff never retype
 * what the dealership already gave. The labels are the contract between the two: change one and
 * change both, which is why they live side by side here and are tested together.
 */
const LABELS = {
  dealership: "Dealership",
  website: "Website",
  town: "Town",
  stock: "Stock",
} as const;

export function signupMessage(
  data: Pick<DealerSignup, "dealership" | "website" | "town" | "stock">,
): string {
  const stock = STOCK_SIZES.find((size) => size.value === data.stock)?.label ?? data.stock;
  return [
    `${LABELS.dealership}: ${data.dealership}`,
    `${LABELS.website}: ${data.website?.trim() || "none given"}`,
    `${LABELS.town}: ${data.town}`,
    `${LABELS.stock}: ${stock}`,
  ].join("\n");
}

export type SignupRead = { dealership: string; website: string; town: string; stock: string };

export function readSignup(message: string | null | undefined): SignupRead {
  const lines = new Map<string, string>();
  for (const line of (message ?? "").split(/\r?\n/)) {
    const at = line.indexOf(": ");
    if (at > 0) lines.set(line.slice(0, at), line.slice(at + 2).trim());
  }
  const website = lines.get(LABELS.website) ?? "";
  return {
    dealership: lines.get(LABELS.dealership) ?? "",
    website: website === "none given" ? "" : website,
    town: lines.get(LABELS.town) ?? "",
    stock: lines.get(LABELS.stock) ?? "",
  };
}
