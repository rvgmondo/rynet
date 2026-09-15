import { Award, Building2, FileCheck2, type LucideIcon, UserCheck } from "lucide-react";

/**
 * What Rynet checks before a dealership can list, in the order a dealership goes through it.
 *
 * One list, read by /how-verification-works and by the home page, so the short version on the
 * front page can never promise more than the full page does.
 *
 * EVERY SENTENCE IS ONE THE CODE KEEPS. A dealership starts as pending and only platform staff can
 * change that (Dealers.verificationStatus has its own access rule); stock cannot go live unless the
 * dealership is verified (the beforeChange hook in src/collections/Vehicles.ts); memberships can
 * only be added by staff (Dealers.accreditations). There is no recorded decision trail of who
 * approved a dealership, so nothing here claims one. Change the code first, then this list.
 */
export type VerificationCheck = {
  icon: LucideIcon;
  title: string;
  /** The full sentence, for the verification page. */
  body: string;
  /** A shorter sentence for the home page, saying nothing the full one does not. */
  summary: string;
};

export const VERIFICATION_CHECKS: VerificationCheck[] = [
  {
    icon: Building2,
    title: "The business is registered",
    body: "We record the dealership's name as CIPC registered it, which can differ from the name on the sign, with its company registration number, and check the two belong together.",
    summary:
      "We record the name CIPC registered the business under, with its company registration number, and check the two belong together.",
  },
  {
    icon: FileCheck2,
    title: "The paperwork holds up",
    body: "We record the VAT number of a dealership registered for VAT and the motor trade number of one that holds it, and ask for proof of a trading address you can visit, not just a postal one.",
    summary:
      "A VAT number where the dealership is registered for VAT, a motor trade number where it holds one, and proof of a trading address you can visit.",
  },
  {
    icon: Award,
    title: "Memberships are checked, not copied",
    body: "RMI, NADA, MIWA or SAMBRA membership appears on a profile only when Rynet staff add it after seeing the certificate. A dealership cannot add one to its own profile.",
    summary:
      "An industry membership shows on a profile only once Rynet staff have seen the certificate and added it.",
  },
  {
    icon: UserCheck,
    title: "A person at Rynet decides",
    body: "Every dealership starts as pending. Only Rynet staff can mark it verified, and a dealership cannot change its own status. Until it is verified, none of its stock can go live.",
    summary:
      "Every dealership starts as pending and only Rynet staff can mark it verified. Until then, not one of its cars can go live.",
  },
];
