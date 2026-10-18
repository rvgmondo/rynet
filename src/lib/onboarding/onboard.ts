import type { Payload, PayloadRequest } from "payload";

import { slugify } from "@/lib/slug";

/**
 * Putting a dealership on Rynet in one step, for staff, after the dealership has said yes.
 *
 * The whole point of the onboarding offer is that the dealership does nothing: no form, no
 * account, no typing their stock in again. So staff fill in one screen with what the dealership
 * told them, and this creates the dealership and its main branch together, verified, ready for
 * cars. Loading the cars is the next step and lives with the import (stock-import/).
 *
 * WHY IT IS VERIFIED STRAIGHT AWAY
 *
 * Only verified dealerships can put cars live, and the onboarding screen will not submit until
 * staff have ticked that they have confirmed the business is a registered dealership that has
 * agreed to list. The verification note records who confirmed it, when, and on what, which is the
 * audit trail behind "every seller is checked".
 *
 * NO LOGIN IS CREATED HERE
 *
 * The login is its own step (src/lib/portal/invite.ts, step 4 on the desk), because a password
 * nobody chose is not a login: the account is made with a link for the dealership to choose
 * theirs, and only once staff have the person's email address to sign in with.
 */

export type OnboardInput = {
  tradingName: string;
  /** The CIPC name. Left empty, the trading name stands in and the note says it is still owed. */
  legalName?: string | null;
  contactName: string;
  email?: string | null;
  phone: string;
  whatsapp?: string | null;
  websiteUrl?: string | null;
  registrationNumber?: string | null;
  addressLine1: string;
  suburb?: string | null;
  cityId: number;
  provinceId: number;
  /** What staff confirmed, in their own words, for the verification note. */
  confirmedHow: string;
};

export type OnboardResult = { dealerId: number; branchId: number; slug: string };

/** During the launch every onboarded dealership can list its whole stock. */
export const LAUNCH_LISTING_LIMIT = 1000;

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

/** The problems with an onboarding form, as a person would want them listed. */
export function onboardProblems(input: Partial<OnboardInput>): string[] {
  const problems: string[] = [];
  if (!clean(input.tradingName)) problems.push("The dealership's name is missing.");
  if (!clean(input.contactName)) problems.push("Who you spoke to is missing.");
  if (!clean(input.phone)) problems.push("A phone number is missing.");
  if (!clean(input.addressLine1)) problems.push("The street address is missing.");
  if (!input.cityId) problems.push("Choose the town.");
  if (!input.provinceId) problems.push("Choose the province.");
  if (!clean(input.confirmedHow)) {
    problems.push(
      "Say how you confirmed they are a registered dealership that has agreed to list.",
    );
  }
  const email = clean(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    problems.push("The email address looks wrong.");
  return problems;
}

/** A web address name no other dealership has, made from the trading name. */
export async function freeSlug(
  payload: Payload,
  tradingName: string,
  req?: Partial<PayloadRequest>,
): Promise<string> {
  const base = slugify(tradingName) || "dealership";
  for (let attempt = 1; attempt < 50; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const taken = await payload.count({
      collection: "dealers",
      where: { slug: { equals: slug } },
      overrideAccess: true,
      req,
    });
    if (taken.totalDocs === 0) return slug;
  }
  throw new Error("Could not find a free web address for this dealership.");
}

export async function onboardDealership(
  payload: Payload,
  input: OnboardInput,
  staff: { name?: string | null; email?: string | null },
  now: Date = new Date(),
  req?: Partial<PayloadRequest>,
): Promise<OnboardResult> {
  const problems = onboardProblems(input);
  if (problems.length > 0) throw new Error(problems.join(" "));

  const tradingName = input.tradingName.trim();
  const slug = await freeSlug(payload, tradingName, req);
  const who = staff.name?.trim() || staff.email?.trim() || "a staff member";
  const day = now.toISOString().slice(0, 10);

  const owed = [
    ...(clean(input.legalName) ? [] : ["the registered company name"]),
    ...(clean(input.registrationNumber) ? [] : ["the CIPC registration number"]),
  ];
  const verificationNotes = [
    `Onboarded and verified by ${who} on ${day}.`,
    `How it was confirmed: ${input.confirmedHow.trim()}`,
    `Contact: ${input.contactName.trim()}, ${input.phone.trim()}${clean(input.email) ? `, ${clean(input.email)}` : ""}.`,
    owed.length > 0 ? `Still to collect: ${owed.join(" and ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const website = clean(input.websiteUrl);
  const dealer = await payload.create({
    collection: "dealers",
    data: {
      tradingName,
      legalName: clean(input.legalName) ?? tradingName,
      slug,
      verificationStatus: "verified",
      isDemonstration: false,
      verificationNotes,
      listingLimit: LAUNCH_LISTING_LIMIT,
      ...(clean(input.registrationNumber)
        ? { registrationNumber: clean(input.registrationNumber) }
        : {}),
      principal: {
        name: input.contactName.trim(),
        ...(clean(input.email) ? { email: clean(input.email) } : {}),
        phone: input.phone.trim(),
      },
      ...(clean(input.whatsapp) ? { whatsappNumber: clean(input.whatsapp) } : {}),
      ...(website ? { stockFeed: { websiteUrl: website, readWebsite: false } } : {}),
    },
    overrideAccess: true,
    req,
  });

  try {
    const branch = await payload.create({
      collection: "branches",
      data: {
        name: tradingName,
        slug: "main",
        dealer: dealer.id as number,
        isPrimary: true,
        addressLine1: input.addressLine1.trim(),
        ...(clean(input.suburb) ? { suburb: clean(input.suburb) } : {}),
        city: input.cityId,
        province: input.provinceId,
        phone: input.phone.trim(),
        ...(clean(input.whatsapp) ? { whatsapp: clean(input.whatsapp) } : {}),
        ...(clean(input.email) ? { email: clean(input.email) } : {}),
      },
      overrideAccess: true,
      req,
    });
    return { dealerId: dealer.id as number, branchId: branch.id as number, slug };
  } catch (error) {
    // A dealership with no branch cannot hold a car. Take it away again rather than leave half.
    await payload.delete({ collection: "dealers", id: dealer.id, overrideAccess: true, req });
    throw error;
  }
}
