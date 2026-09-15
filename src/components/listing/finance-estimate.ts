import { calculateFinance, type FinanceResult } from "@/lib/finance";
import type { FinanceDefault } from "@/payload-types";

/**
 * The finance assumptions a listing page works from, in one plain object.
 *
 * Plain, because the same object travels to the client estimator as a prop, and a Payload
 * global carries dates and ids that have no business crossing that boundary. Every caller on
 * the page (the one-line estimate beside the price, the panel, the adjustable island) computes
 * from this, so the figure beside the price and the figure in the panel cannot disagree.
 */
export type FinanceAssumptions = {
  primeRatePercent: number;
  offsetPercent: number;
  ratePercent: number;
  termMonths: number;
  depositPercent: number;
  balloonPercent: number;
  initiationFee: number;
  monthlyServiceFee: number;
};

export function assumptionsFrom(defaults: FinanceDefault): FinanceAssumptions {
  const primeRatePercent = defaults.primeRatePercent ?? 10.5;
  const offsetPercent = defaults.defaultRateOffsetPercent ?? 1.5;
  return {
    primeRatePercent,
    offsetPercent,
    ratePercent: primeRatePercent + offsetPercent,
    termMonths: defaults.defaultTermMonths ?? 72,
    depositPercent: defaults.defaultDepositPercent ?? 10,
    balloonPercent: defaults.defaultBalloonPercent ?? 0,
    initiationFee: defaults.initiationFee ?? 0,
    monthlyServiceFee: defaults.monthlyServiceFee ?? 0,
  };
}

/**
 * An estimate, or null when the calculator refuses the input.
 *
 * calculateFinance throws rather than return a negative or meaningless instalment. Null is the
 * honest answer to that: the page shows no figure instead of a broken one beside a price.
 */
export function estimateFor(
  price: number,
  assumptions: FinanceAssumptions,
  depositPercent: number = assumptions.depositPercent,
  termMonths: number = assumptions.termMonths,
): FinanceResult | null {
  try {
    return calculateFinance({
      price,
      deposit: (price * depositPercent) / 100,
      termMonths,
      annualRatePercent: assumptions.ratePercent,
      balloonPercent: assumptions.balloonPercent,
      initiationFee: assumptions.initiationFee,
      monthlyServiceFee: assumptions.monthlyServiceFee,
    });
  } catch {
    return null;
  }
}

/**
 * A percentage as a person writes it: "12%", "12.5%", never "12.00%".
 */
export function percent(value: number): string {
  return `${Number.parseFloat(value.toFixed(2))}%`;
}

/**
 * The stored disclaimer, and whether it still needs the review marker.
 *
 * The seeded wording opens with the words "REQUIRES LEGAL REVIEW." typed into the text itself. A
 * migration to take them out of the stored row is waiting on a shared change, so until it lands
 * this strips them for display and treats their presence as a second reason to show the marker:
 * the wording is marked unreviewed while `lastReviewedAt` is empty OR while an admin has left the
 * words in. It never decides on its own that the wording has been reviewed.
 */
const REVIEW_PREFIX = /^\s*requires legal review\.?\s*/i;

export function disclaimerFrom(defaults: FinanceDefault): {
  text: string;
  reviewedAt: string | null;
} {
  const raw = defaults.disclaimer ?? "";
  const flagged = REVIEW_PREFIX.test(raw);
  return {
    text: raw.replace(REVIEW_PREFIX, "").trim(),
    reviewedAt: flagged ? null : (defaults.lastReviewedAt ?? null),
  };
}
