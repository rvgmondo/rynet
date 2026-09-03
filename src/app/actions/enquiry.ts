"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { type EnquiryState, enquirySchema } from "@/lib/enquiry-schema";
import { rateLimit, visitorKey } from "@/lib/rate-limit";

/**
 * Lead submission.
 *
 * This is the commercial heart of the platform: everything else exists so that this can
 * happen. It is also the most attacked surface on any marketplace, so it carries four
 * layers before a record is written.
 *
 * 1. **Schema validation** with the same Zod schema the client form uses, so the two cannot
 *    drift. The client copy is a convenience; this one is the control.
 * 2. **A honeypot.** A field no human sees and every naive bot fills.
 * 3. **A timing check.** A form submitted within two seconds of rendering was not typed.
 * 4. **Rate limiting** per hashed visitor.
 *
 * Cloudflare Turnstile slots in as a fifth once the site is behind Cloudflare. It is
 * deliberately not stubbed in: a challenge that always passes is worse than none, because
 * it looks like protection.
 *
 * NOTE: this module may export NOTHING but async functions. A "use server" file that
 * exports a value, such as the Zod schema this once carried, stops Next creating the action
 * reference, and the form silently falls back to a plain HTML POST that writes no lead. The
 * schema lives in src/lib/enquiry-schema.ts for that reason.
 *
 * POPIA: consent is recorded as its own append-only record with the wording the person
 * actually agreed to, the policy version, and a hashed IP. A boolean on the lead could not
 * answer "what did they agree to, and when", which is the question that matters.
 */

/** The exact wording a person agrees to. Stored verbatim, because this page will change. */
const CONSENT_WORDING =
  "I agree that Rynet may pass the details I have given to the selling dealership so they can respond to this enquiry, and may contact me about it.";
const POLICY_VERSION = "2026-08-privacy-v1";

const MINIMUM_FILL_MS = 2000;
/*
 * Five enquiries per ten minutes per visitor. Generous for a person comparing three cars,
 * tight enough that a script gets nowhere.
 *
 * Overridable by environment, because an end-to-end suite shares one visitor hash across
 * every test and would otherwise lock itself out after five. The default is what ships.
 */
const RATE_LIMIT = Number(process.env.ENQUIRY_RATE_LIMIT) || 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function submitEnquiry(
  _previous: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message") || undefined,
    type: formData.get("type") || "enquiry",
    vehicleRef: formData.get("vehicleRef") || undefined,
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    website: formData.get("website") || undefined,
    elapsedMs: formData.get("elapsedMs") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Some details need fixing before we can send this.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  /**
   * The honeypot and the timing check both fail SILENTLY, reporting success.
   *
   * Telling a bot which check caught it is telling whoever wrote it what to change. A
   * person cannot trigger either: the field is hidden from every rendering path including
   * screen readers, and nobody types a name, an email and a phone number in two seconds.
   */
  if (data.website && data.website.length > 0) {
    return { status: "success", message: "Thanks. The dealership will be in touch." };
  }
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MINIMUM_FILL_MS) {
    return { status: "success", message: "Thanks. The dealership will be in touch." };
  }

  const requestHeaders = await headers();
  const key = await visitorKey(requestHeaders, process.env.PAYLOAD_SECRET ?? "rynet");
  const limit = rateLimit(`enquiry:${key}`, RATE_LIMIT, RATE_WINDOW_MS);

  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      status: "error",
      message: `That is a few enquiries in a short time. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or phone the dealership directly.`,
    };
  }

  try {
    const payload = await getPayload({ config });

    // Resolve the vehicle so the lead routes to the right dealership. The reference is
    // looked up rather than trusted: a submitted dealer id would be a way to post a lead
    // into someone else's inbox.
    let vehicleId: number | undefined;
    let dealerId: number | undefined;
    let branchId: number | undefined;

    if (data.vehicleRef) {
      const found = await payload.find({
        collection: "vehicles",
        where: { publicRef: { equals: data.vehicleRef } },
        limit: 1,
        depth: 0,
      });
      const vehicle = found.docs[0];
      if (vehicle) {
        vehicleId = vehicle.id;
        dealerId = typeof vehicle.dealer === "number" ? vehicle.dealer : vehicle.dealer?.id;
        branchId = typeof vehicle.branch === "number" ? vehicle.branch : vehicle.branch?.id;
      }
    }

    const consent = await payload.create({
      collection: "consent-records",
      data: {
        purpose: "enquiry",
        subjectEmail: data.email,
        subjectPhone: data.phone,
        policyVersion: POLICY_VERSION,
        grantedAt: new Date().toISOString(),
        evidence: CONSENT_WORDING,
        ipHash: key,
      },
    });

    await payload.create({
      collection: "leads",
      data: {
        type: data.type,
        vehicle: vehicleId,
        dealer: dealerId,
        branch: branchId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        status: "new",
        consent: consent.id,
        source: {
          referrer: requestHeaders.get("referer") ?? undefined,
          landingPage: data.vehicleRef ? `/vehicles/${data.vehicleRef}` : undefined,
          deviceType: /mobile/i.test(requestHeaders.get("user-agent") ?? "") ? "mobile" : "desktop",
        },
      },
    });

    return {
      status: "success",
      message: "Sent. The dealership has your details and will be in touch.",
    };
  } catch (error) {
    // Never surface the underlying error to a visitor: it can leak schema detail, and it is
    // no use to them anyway. It goes to the log, where it is useful.
    console.error("Enquiry submission failed:", error);
    return {
      status: "error",
      message:
        "Something went wrong sending that. Try again, or phone the dealership directly using the number on this page.",
    };
  }
}
