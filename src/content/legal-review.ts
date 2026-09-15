/**
 * When each piece of legal and compliance wording was last reviewed by a South African attorney.
 *
 * Null means it has not been, and while it is null the page it lives on carries the standard
 * "Requires legal review" marker (src/components/layout/legal-review-marker.tsx). That is the
 * owner's instruction and it is not negotiable in code review: unreviewed legal copy is marked,
 * visibly, to every visitor.
 *
 * It is ONE marker in ONE treatment. The site used to say the same thing four ways: a shouted
 * "REQUIRES LEGAL REVIEW." glued to the front of the finance disclaimer, a warning banner with a
 * paragraph on the legal pages, "A draft, not reviewed by an attorney." in the middle of the
 * section 18 notice on a lead form, and nothing at all in other places. On a conversion page a
 * build note reads as a site that is not finished; a small consistent marker reads as a company
 * that is careful.
 *
 * To clear one: record the date the attorney signed the wording off, as an ISO date, and the
 * marker disappears from that page on the next deploy. The finance disclaimer is not in this
 * file, because its reviewed date is a field an admin sets in the CMS
 * (FinanceDefaults.lastReviewedAt) and the marker there reads that instead.
 */
export const LEGAL_REVIEWED_AT: Record<LegalDocument, string | null> = {
  privacy: null,
  terms: null,
  cookies: null,
  /** The POPIA section 18 notice printed on /sell-to-a-dealer. */
  sellNotice: null,
  /** The multi-recipient consent wording on the sell form, stored verbatim on each record. */
  sellConsent: null,
  /** The consent wording in the enquiry dialog on a listing, stored verbatim on each record. */
  enquiryConsent: null,
  /** The consent wording on the Rynet Digital qualification form, stored verbatim on each record. */
  agencyConsent: null,
};

export type LegalDocument =
  | "privacy"
  | "terms"
  | "cookies"
  | "sellNotice"
  | "sellConsent"
  | "enquiryConsent"
  | "agencyConsent";
