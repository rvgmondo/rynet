"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { MOCKUP_OFFER } from "@/content/agency/mockup-offer";
import {
  MOCKUP_CONSENT_WORDING,
  type MockupRequestState,
  mockupMessage,
  mockupRequestSchema,
} from "@/lib/mockup-request-schema";
import { rateLimit, visitorKey } from "@/lib/rate-limit";

/**
 * A dealership asking for a free website mockup.
 *
 * The same four layers as every other write path: Zod, a honeypot, a timing check and a rate
 * limit per hashed visitor. Writes a `mockup_request` lead with no dealer, visible to platform
 * staff only, under "Mockup requests" in Enquiries.
 *
 * NOTE: this module may export NOTHING but async functions. See the schema module.
 */

const POLICY_VERSION = "2026-09-privacy-v3";
const MINIMUM_FILL_MS = 3000;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function submitMockupRequest(
  _previous: MockupRequestState,
  formData: FormData,
): Promise<MockupRequestState> {
  const parsed = mockupRequestSchema.safeParse({
    dealership: formData.get("dealership"),
    website: formData.get("website") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
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
    return { status: "error", message: "A few answers need fixing first.", fieldErrors };
  }

  const data = parsed.data;
  const succeeded: MockupRequestState = {
    status: "success",
    message: `Thank you. Your mockup for ${data.dealership} is on its way: we send the private link to ${data.phone} within ${MOCKUP_OFFER.turnaround}.`,
  };

  if (data.hp && data.hp.length > 0) return succeeded;
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MINIMUM_FILL_MS) return succeeded;

  const requestHeaders = await headers();
  const key = await visitorKey(requestHeaders, process.env.PAYLOAD_SECRET ?? "rynet");
  const limit = rateLimit(`mockup:${key}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return {
      status: "error",
      message:
        "That is a few requests in a short time. Try again shortly, or email digital@rynet.co.za.",
    };
  }

  try {
    const payload = await getPayload({ config });

    const consent = await payload.create({
      collection: "consent-records",
      data: {
        purpose: "enquiry",
        subjectEmail: data.email || undefined,
        subjectPhone: data.phone,
        policyVersion: POLICY_VERSION,
        grantedAt: new Date().toISOString(),
        evidence: MOCKUP_CONSENT_WORDING,
        ipHash: key,
      },
    });

    await payload.create({
      collection: "leads",
      data: {
        type: "mockup_request",
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        message: mockupMessage(data),
        status: "new",
        consent: consent.id,
        source: {
          referrer: requestHeaders.get("referer") ?? undefined,
          landingPage: "/digital/free-mockup",
          deviceType: /mobile/i.test(requestHeaders.get("user-agent") ?? "") ? "mobile" : "desktop",
        },
      },
    });

    return succeeded;
  } catch (error) {
    console.error("Mockup request failed:", error);
    return {
      status: "error",
      message: "Something went wrong sending that. Try again, or email digital@rynet.co.za.",
    };
  }
}
