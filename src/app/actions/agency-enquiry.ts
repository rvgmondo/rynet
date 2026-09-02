"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import {
  AGENCY_INTERESTS,
  type AgencyEnquiryState,
  agencyEnquirySchema,
  DEALERSHIP_SIZES,
  URGENCIES,
} from "@/lib/agency-enquiry-schema";
import { rateLimit, visitorKey } from "@/lib/rate-limit";

/**
 * The agency qualification form.
 *
 * Same four layers as the marketplace enquiry, for the same reasons: Zod validation as the
 * control rather than the convenience, a honeypot, a submission timing check, and a rate
 * limit per hashed visitor. Both bot checks fail silently and report success, because
 * telling a script which check caught it is telling whoever wrote it what to change.
 *
 * It writes a `lead` with `type: "agency_enquiry"` and no dealer, which is the whole
 * difference from a marketplace enquiry: this one belongs to Rynet, not to a dealership, so
 * `dealer` is deliberately left empty and the lead is visible only to platform staff.
 *
 * NOTE: this module may export NOTHING but async functions. See the schema module.
 */

/** The exact wording agreed to. Stored verbatim, because this page will change. */
const CONSENT_WORDING =
  "I agree that Rynet may use the details I have given to reply to this enquiry about Rynet Digital's services, and to contact me about it.";
const POLICY_VERSION = "2026-08-privacy-v1";

const MINIMUM_FILL_MS = 4000;
/*
 * Three per ten minutes. Tighter than the marketplace's five, because nobody has a
 * legitimate reason to submit a business qualification three times in ten minutes, whereas
 * a buyer comparing three cars genuinely does.
 */
const RATE_LIMIT = Number(process.env.ENQUIRY_RATE_LIMIT) || 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const labelOf = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export async function submitAgencyEnquiry(
  _previous: AgencyEnquiryState,
  formData: FormData,
): Promise<AgencyEnquiryState> {
  const parsed = agencyEnquirySchema.safeParse({
    dealership: formData.get("dealership"),
    website: formData.get("website") || undefined,
    size: formData.get("size"),
    interests: formData.getAll("interests"),
    urgency: formData.get("urgency"),
    context: formData.get("context") || undefined,
    name: formData.get("name"),
    role: formData.get("role") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone"),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    hp: formData.get("hp") || undefined,
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
      message: "Some answers need fixing before we can send this.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  const succeeded: AgencyEnquiryState = {
    status: "success",
    message: "Thanks. We will come back to you within one working day.",
  };

  if (data.hp && data.hp.length > 0) return succeeded;
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MINIMUM_FILL_MS) return succeeded;

  const requestHeaders = await headers();
  const key = await visitorKey(requestHeaders, process.env.PAYLOAD_SECRET ?? "rynet");
  const limit = rateLimit(`agency:${key}`, RATE_LIMIT, RATE_WINDOW_MS);

  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      status: "error",
      message: `That is a few submissions in a short time. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or email digital@rynet.co.za.`,
    };
  }

  try {
    const payload = await getPayload({ config });

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

    // The qualification answers go into the message body rather than into their own
    // columns. They are read by a person preparing for a call, not queried or reported on,
    // and adding five columns to `leads` for a form that may change next month would be
    // schema churn for no gain. If they ever need filtering, they earn columns then.
    const summary = [
      `Dealership: ${data.dealership}`,
      `Website: ${data.website || "none given"}`,
      `Size: ${labelOf(DEALERSHIP_SIZES, data.size)}`,
      `Interested in: ${data.interests.map((value) => labelOf(AGENCY_INTERESTS, value)).join(", ")}`,
      `Timing: ${labelOf(URGENCIES, data.urgency)}`,
      data.role ? `Role: ${data.role}` : null,
      "",
      data.context || "No further detail given.",
    ]
      .filter((line) => line !== null)
      .join("\n");

    await payload.create({
      collection: "leads",
      data: {
        type: "agency_enquiry",
        // No dealer. This lead belongs to Rynet, so it stays visible to platform staff only
        // rather than landing in a dealership's inbox.
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: summary,
        status: "new",
        consent: consent.id,
        source: {
          referrer: requestHeaders.get("referer") ?? undefined,
          landingPage: "/digital/contact",
          deviceType: /mobile/i.test(requestHeaders.get("user-agent") ?? "") ? "mobile" : "desktop",
        },
      },
    });

    return succeeded;
  } catch (error) {
    // Never surface the underlying error: it can leak schema detail and is no use to the
    // person reading it. It goes to the log, where it is useful.
    console.error("Agency enquiry submission failed:", error);
    return {
      status: "error",
      message:
        "Something went wrong sending that. Try again, or email digital@rynet.co.za directly.",
    };
  }
}
