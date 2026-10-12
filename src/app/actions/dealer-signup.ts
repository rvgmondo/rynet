"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import {
  DEALER_SIGNUP_CONSENT_WORDING,
  type DealerSignupState,
  dealerSignupSchema,
  signupMessage,
} from "@/lib/dealer-signup-schema";
import { rateLimit, visitorKey } from "@/lib/rate-limit";

/**
 * A dealership asking to list, from /list-your-stock.
 *
 * The same four layers as every other write path on this site: Zod as the control, a honeypot,
 * a submission timing check, and a rate limit per hashed visitor. Both bot checks fail silently
 * and report success.
 *
 * It writes a lead with `type: "dealer_signup"` and no dealer, so it belongs to Rynet and is
 * visible to platform staff only. The onboarding desk lists these at the top and fills its form
 * in from them, so a sign-up becomes a live showroom without anyone retyping anything.
 *
 * NOTE: this module may export NOTHING but async functions. See the schema module.
 */

const POLICY_VERSION = "2026-09-privacy-v3";
const MINIMUM_FILL_MS = 3000;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function submitDealerSignup(
  _previous: DealerSignupState,
  formData: FormData,
): Promise<DealerSignupState> {
  const parsed = dealerSignupSchema.safeParse({
    dealership: formData.get("dealership"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    website: formData.get("website") || undefined,
    town: formData.get("town"),
    stock: formData.get("stock"),
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
  const succeeded: DealerSignupState = {
    status: "success",
    message: `Thank you. We will call you on ${data.phone} to set up ${data.dealership}.`,
  };

  if (data.hp && data.hp.length > 0) return succeeded;
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MINIMUM_FILL_MS) return succeeded;

  const requestHeaders = await headers();
  const key = await visitorKey(requestHeaders, process.env.PAYLOAD_SECRET ?? "rynet");
  const limit = rateLimit(`dealersignup:${key}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return {
      status: "error",
      message:
        "That is a few sign-ups in a short time. Try again shortly, or email hello@rynet.co.za.",
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
        evidence: DEALER_SIGNUP_CONSENT_WORDING,
        ipHash: key,
      },
    });

    await payload.create({
      collection: "leads",
      data: {
        type: "dealer_signup",
        // No dealer: the dealership is not on Rynet yet. This lead belongs to Rynet.
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        message: signupMessage(data),
        status: "new",
        consent: consent.id,
        source: {
          referrer: requestHeaders.get("referer") ?? undefined,
          landingPage: "/list-your-stock",
          deviceType: /mobile/i.test(requestHeaders.get("user-agent") ?? "") ? "mobile" : "desktop",
        },
      },
    });

    return succeeded;
  } catch (error) {
    console.error("Dealer sign-up failed:", error);
    return {
      status: "error",
      message: "Something went wrong sending that. Try again, or email hello@rynet.co.za.",
    };
  }
}
