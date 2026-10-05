import type { Payload, PayloadRequest } from "payload";

/**
 * Amico Motors as a real dealership on Rynet.
 *
 * EVERY FACT BELOW IS PUBLISHED ON THEIR OWN WEBSITE.
 *
 * The address, the landline, the email address, the dealer principal's name and the trading hours
 * are all printed on amicomotors.co.za, on the contact page and in the footer of every page. None
 * of it is inferred, and nothing that is not printed there is filled in: the registered company
 * name, the CIPC number, the VAT number and a WhatsApp number for buyers are all left empty, and
 * they are listed in docs/CONTENT-NEEDED.md as things to ask Amico for.
 *
 * WHY IT IS MARKED VERIFIED
 *
 * Because the owner confirmed it, and the note on the record says so and says who by. On a
 * marketplace whose whole promise is "verified dealers only", the verification note is the audit
 * trail for that promise, so it records the decision rather than implying one was made.
 *
 * The two published cellphone numbers, the sales number and the dealer principal's, are
 * deliberately NOT written onto the record. The landline is the number a buyer gets, enquiries go
 * through Rynet's own form, and a person's cellphone becoming a public call button on someone
 * else's website is not a decision an import gets to make.
 */

export const AMICO_SLUG = "amico-motors";
export const AMICO_TRADING_NAME = "Amico Motors";

/** Published on https://amicomotors.co.za/contact-us/ and in the footer of every page. */
export const AMICO_PUBLISHED = {
  addressLine1: "505 Swemmer Street",
  suburb: "Gezina",
  city: "Pretoria",
  province: "Gauteng",
  postalCode: "0084",
  phone: "012 335 1640",
  email: "amelda@amicomotors.co.za",
  principalName: "Mark Greeff",
  website: "https://amicomotors.co.za/",
} as const;

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/** Mondays to Thursdays 08:00 to 17:00, Fridays to 16:00, Saturdays to 13:00, Sundays closed. */
const TRADING_HOURS: {
  day: Day;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
}[] = [
  { day: "monday", opensAt: "08:00", closesAt: "17:00", closed: false },
  { day: "tuesday", opensAt: "08:00", closesAt: "17:00", closed: false },
  { day: "wednesday", opensAt: "08:00", closesAt: "17:00", closed: false },
  { day: "thursday", opensAt: "08:00", closesAt: "17:00", closed: false },
  { day: "friday", opensAt: "08:00", closesAt: "16:00", closed: false },
  { day: "saturday", opensAt: "08:00", closesAt: "13:00", closed: false },
  { day: "sunday", opensAt: null, closesAt: null, closed: true },
];

const VERIFICATION_NOTE = [
  "Verified on the owner's instruction: Rynet has Amico Motors' permission to list their cars and",
  "their photographs, and to read them from amicomotors.co.za.",
  "",
  "Still to confirm with Amico, and not filled in until they do: the registered company name and",
  "CIPC number (their site trades as Amico Motors and names itself Amico Motors | Multi Franchise",
  "Motor Group, while the portals list SA Multi Franchise Motor Group), the VAT number, a WhatsApp",
  "number for buyers, and which number buyer enquiries should be answered on.",
  "",
  "The address, landline, email address, dealer principal's name and trading hours on this record",
  "are all taken from amicomotors.co.za and nothing else.",
].join("\n");

export type DealershipResult = {
  dealerId: number;
  branchId: number;
  created: boolean;
  branchCreated: boolean;
  /** What would have been written, when nothing was. */
  planned: string[];
};

type Options = {
  payload: Payload;
  dryRun: boolean;
  /** Cars allowed. Set above their stock so a full import cannot be cut off by the limit. */
  listingLimit?: number;
  req?: Partial<PayloadRequest>;
};

async function idOfTaxonomy(
  payload: Payload,
  collection: "provinces" | "cities",
  name: string,
  req?: Partial<PayloadRequest>,
): Promise<number | null> {
  const found = await payload.find({
    collection,
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const doc = found.docs[0] as { id?: number } | undefined;
  return doc?.id ?? null;
}

/**
 * Creates or updates the dealership and its Gezina branch, and hands back their ids.
 *
 * Re-runnable. A second run finds both, corrects anything that has drifted, and changes nothing
 * else: it never resets the verification note, and it never touches fields a person may have
 * filled in by hand.
 */
export async function ensureAmicoDealership(options: Options): Promise<DealershipResult> {
  const { payload, dryRun, listingLimit = 150, req } = options;
  const planned: string[] = [];

  const existing = await payload.find({
    collection: "dealers",
    where: { slug: { equals: AMICO_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const found = existing.docs[0] as { id: number; verificationNotes?: string | null } | undefined;

  const profile = {
    tradingName: AMICO_TRADING_NAME,
    // Their site's own name for the business. Not the CIPC name, which they have not published.
    legalName: AMICO_TRADING_NAME,
    slug: AMICO_SLUG,
    verificationStatus: "verified" as const,
    isDemonstration: false,
    listingLimit,
    principal: { name: AMICO_PUBLISHED.principalName },
  };

  if (!found) {
    planned.push(`create the dealership ${AMICO_TRADING_NAME}, verified, ${listingLimit} cars`);
    if (dryRun) {
      return { dealerId: -1, branchId: -1, created: true, branchCreated: true, planned };
    }
    const created = await payload.create({
      collection: "dealers",
      data: { ...profile, verificationNotes: VERIFICATION_NOTE },
      overrideAccess: true,
      req,
    });
    const branch = await ensureBranch(payload, created.id as number, dryRun, planned, req);
    return {
      dealerId: created.id as number,
      branchId: branch.id,
      created: true,
      branchCreated: branch.created,
      planned,
    };
  }

  planned.push(`update the dealership ${AMICO_TRADING_NAME}`);
  if (!dryRun) {
    await payload.update({
      collection: "dealers",
      id: found.id,
      data: {
        ...profile,
        // Only written when there is nothing there, so a staff member's own notes survive a run.
        ...(found.verificationNotes?.trim() ? {} : { verificationNotes: VERIFICATION_NOTE }),
      },
      overrideAccess: true,
      req,
    });
  }

  const branch = await ensureBranch(payload, found.id, dryRun, planned, req);
  return {
    dealerId: found.id,
    branchId: branch.id,
    created: false,
    branchCreated: branch.created,
    planned,
  };
}

async function ensureBranch(
  payload: Payload,
  dealerId: number,
  dryRun: boolean,
  planned: string[],
  req?: Partial<PayloadRequest>,
): Promise<{ id: number; created: boolean }> {
  const existing = await payload.find({
    collection: "branches",
    where: { and: [{ dealer: { equals: dealerId } }, { slug: { equals: "gezina" } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const found = existing.docs[0] as { id: number } | undefined;

  const [provinceId, cityId] = await Promise.all([
    idOfTaxonomy(payload, "provinces", AMICO_PUBLISHED.province, req),
    idOfTaxonomy(payload, "cities", AMICO_PUBLISHED.city, req),
  ]);
  if (!provinceId || !cityId) {
    throw new Error(
      `Rynet has no ${provinceId ? "town called Pretoria" : "province called Gauteng"} in its lists, so the branch cannot be placed. Add it and run this again.`,
    );
  }

  const data = {
    name: `${AMICO_TRADING_NAME} Gezina`,
    slug: "gezina",
    dealer: dealerId,
    isPrimary: true,
    addressLine1: AMICO_PUBLISHED.addressLine1,
    suburb: AMICO_PUBLISHED.suburb,
    city: cityId,
    province: provinceId,
    postalCode: AMICO_PUBLISHED.postalCode,
    phone: AMICO_PUBLISHED.phone,
    email: AMICO_PUBLISHED.email,
    tradingHours: TRADING_HOURS,
  };

  if (found) {
    planned.push("update the Gezina branch");
    if (!dryRun) {
      await payload.update({
        collection: "branches",
        id: found.id,
        data,
        overrideAccess: true,
        req,
      });
    }
    return { id: found.id, created: false };
  }

  planned.push(`create the Gezina branch at ${AMICO_PUBLISHED.addressLine1}`);
  if (dryRun) return { id: -1, created: true };

  const created = await payload.create({
    collection: "branches",
    data,
    overrideAccess: true,
    req,
  });
  return { id: created.id as number, created: true };
}
