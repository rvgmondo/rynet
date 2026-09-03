"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { rateLimit, visitorKey } from "@/lib/rate-limit";
import {
  MAX_DEALERSHIPS,
  type SellToDealerState,
  sellToDealerSchema,
} from "@/lib/sell-to-dealer-schema";

/**
 * A private individual offering their car to dealerships.
 *
 * The same four layers as every other write path on this site: Zod validation as the control
 * rather than the convenience, a honeypot, a submission timing check, and a rate limit per
 * hashed visitor. Both bot checks fail silently and report success, because telling a script
 * which one caught it is telling whoever wrote it what to change.
 *
 * TWO THINGS ARE DIFFERENT HERE AND BOTH MATTER.
 *
 * **The lead has no dealer.** Every other lead on the platform belongs to the dealership
 * selling the vehicle. This one belongs to Rynet, because it is going to be offered to
 * several dealerships and the platform has to hold it while that happens. `dealer` stays
 * empty, which means the row is visible to platform staff only until it is distributed.
 * Picking one dealership here would be arbitrary and would quietly decide who gets the
 * business.
 *
 * **Consent names the recipients.** POPIA consent for "we will pass this to one named
 * dealership" does not cover "we will pass this to five". The wording below says who receives
 * it, how many, where they are, what for, and how to withdraw, and it is stored verbatim
 * against the lead. A checkbox whose label said "we may share your details with partners"
 * would be worthless as evidence and arguably not consent at all.
 *
 * NOTE: this module may export NOTHING but async functions. See the schema module.
 */

/**
 * The exact wording a person agrees to. Stored verbatim on the consent record, because this
 * page will change and the record has to say what was on screen at the time.
 *
 * REQUIRES LEGAL REVIEW. Drafted against POPIA section 18, not reviewed by an attorney.
 */
const CONSENT_WORDING =
  `I agree that Rynet may pass my name, my contact details and the details of my car to ` +
  `verified dealerships in my province that buy this kind of vehicle, so that they can contact ` +
  `me with an offer. Rynet will send it to no more than ${MAX_DEALERSHIPS} dealerships. Each ` +
  `dealership decides for itself what it does with my details once it has them. I can withdraw ` +
  `this at any time by emailing privacy@rynet.co.za.`;

const POLICY_VERSION = "2026-08-privacy-v1";

const MINIMUM_FILL_MS = 4000;
/*
 * Three per ten minutes. A person selling a car submits once, or twice if they own two. The
 * marketplace enquiry limit is five because a buyer comparing three cars legitimately submits
 * more than one; nobody legitimately offers three different cars inside ten minutes.
 */
const RATE_LIMIT = Number(process.env.ENQUIRY_RATE_LIMIT) || 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function submitSellToDealer(
  _previous: SellToDealerState,
  formData: FormData,
): Promise<SellToDealerState> {
  const parsed = sellToDealerSchema.safeParse({
    make: formData.get("make"),
    model: formData.get("model"),
    modelYear: formData.get("modelYear"),
    mileageKm: formData.get("mileageKm"),
    transmission: formData.get("transmission"),
    condition: formData.get("condition"),
    serviceHistory: formData.get("serviceHistory"),
    finance: formData.get("finance"),
    notes: formData.get("notes") || undefined,
    province: formData.get("province"),
    city: formData.get("city"),
    name: formData.get("name"),
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

  const succeeded: SellToDealerState = {
    status: "success",
    message: "Sent. We will pass it to dealerships that buy this kind of car.",
  };

  if (data.hp && data.hp.length > 0) return succeeded;
  if (typeof data.elapsedMs === "number" && data.elapsedMs < MINIMUM_FILL_MS) return succeeded;

  const requestHeaders = await headers();
  const key = await visitorKey(requestHeaders, process.env.PAYLOAD_SECRET ?? "rynet");
  const limit = rateLimit(`selltodealer:${key}`, RATE_LIMIT, RATE_WINDOW_MS);

  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      status: "error",
      message: `That is a few submissions in a short time. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or email hello@rynet.co.za.`,
    };
  }

  try {
    const payload = await getPayload({ config });

    // The province is looked up rather than trusted. A submitted id would be a way to write an
    // arbitrary relationship, and a stale one would put the car in the wrong place.
    let provinceId: number | undefined;
    const province = await payload.find({
      collection: "provinces",
      where: { slug: { equals: data.province } },
      limit: 1,
      depth: 0,
    });
    if (province.docs[0]) provinceId = province.docs[0].id;

    const consent = await payload.create({
      collection: "consent-records",
      data: {
        purpose: "trade_in",
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
        type: "trade_in",
        // No dealer. See the note at the top: this lead belongs to Rynet until it is offered
        // to dealerships, and choosing one here would quietly decide who gets the business.
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: `Wants to sell a ${data.modelYear} ${data.make} ${data.model}.`,
        status: "new",
        consent: consent.id,
        tradeIn: {
          make: data.make,
          model: data.model,
          modelYear: data.modelYear,
          mileageKm: data.mileageKm,
          transmission: data.transmission,
          condition: data.condition,
          serviceHistory: data.serviceHistory,
          finance: data.finance,
          province: provinceId,
          city: data.city,
          notes: data.notes,
        },
        source: {
          referrer: requestHeaders.get("referer") ?? undefined,
          landingPage: "/sell-to-a-dealer",
          deviceType: /mobile/i.test(requestHeaders.get("user-agent") ?? "") ? "mobile" : "desktop",
        },
      },
    });

    return succeeded;
  } catch (error) {
    // Never surface the underlying error: it can leak schema detail and is no use to the
    // person reading it. It goes to the log, where it is useful.
    console.error("Sell to dealer submission failed:", error);
    return {
      status: "error",
      message: "Something went wrong sending that. Try again, or email hello@rynet.co.za.",
    };
  }
}
