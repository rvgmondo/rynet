/**
 * Who Rynet is, as a company. The details a buyer, a dealership and the law all expect.
 *
 * EVERY FIELD THAT IS NOT KNOWN IS NULL, AND NULL RENDERS NOTHING.
 *
 * The Electronic Communications and Transactions Act (section 43) expects a site like this to
 * show its full legal name and status, a physical address, a phone number and its registration
 * number, and the Companies Act expects the registered name and number on the company's
 * publications. A verification platform that asks dealerships for their CIPC registration and
 * proof of address, and shows neither of its own, is failing its own test.
 *
 * None of these values are in the database or anywhere else in the code, and inventing one is
 * out of the question: a made-up registration number on a trust platform is worse than a gap.
 * So each is null until the owner supplies it, every surface that could show it checks, and a
 * line that needs several of them renders only once ALL of them are real, so a half-filled
 * identity with a bracketed placeholder can never ship. Listed in docs/CONTENT-NEEDED.md.
 */
export const COMPANY = {
  /** How the company is known on the site. Real. */
  tradingName: "Rynet",
  /** The town the footers already name. Real, and replaced by the street address once known. */
  town: "Pretoria, Gauteng",
  /** Registered name exactly as CIPC holds it, including "(Pty) Ltd". */
  legalName: null as string | null,
  /** CIPC registration number, in the form 2026/123456/07. */
  registrationNumber: null as string | null,
  /** Only if the company is registered for VAT. */
  vatNumber: null as string | null,
  /** A physical address someone could visit. POPIA section 18(1)(b) needs this on the sell page. */
  streetAddress: null as string | null,
  /** The postal address, if it differs. */
  postalAddress: null as string | null,
  /** A phone number that is answered. */
  phone: null as string | null,
  /** When that phone is answered, in words, for example "Weekdays, 08:00 to 17:00". */
  officeHours: null as string | null,
};

/**
 * The one-line legal identity for a footer, or null while any part of it is missing.
 *
 * All or nothing, deliberately. "Rynet (Pty) Ltd, registration number [to follow]" is exactly the
 * kind of build note that makes a site look unfinished, and a line with a real name and no number
 * reads as though the number is being withheld.
 */
export function companyIdentityLine(): string | null {
  const { legalName, registrationNumber, streetAddress, phone, vatNumber } = COMPANY;
  if (!legalName || !registrationNumber || !streetAddress || !phone) return null;

  return [
    legalName,
    `registration number ${registrationNumber}`,
    vatNumber ? `VAT number ${vatNumber}` : null,
    streetAddress,
    phone,
  ]
    .filter(Boolean)
    .join(", ");
}
