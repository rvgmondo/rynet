import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import {
  assumptionsFrom,
  disclaimerFrom,
  estimateFor,
  type FinanceAssumptions,
  percent,
} from "@/components/listing/finance-estimate";
import { FinanceEstimator } from "@/components/listing/finance-estimator";
import { formatMonthly, formatRand } from "@/lib/format";
import type { FinanceDefault } from "@/payload-types";

/**
 * The finance estimate in one line, for the summary card beside the price.
 *
 * The same compliance rules as the panel, in miniature: the word "estimated" comes before the
 * figure, the total cost of credit sits in the same sentence at the same weight as the instalment,
 * and the deposit, term and any balloon it assumes are stated. It computes from the same assumptions as the
 * panel, so the two can never disagree, and it links down to the panel where the assumptions can
 * be changed and the disclaimer is printed in full.
 *
 * Nothing renders when the calculator refuses the input.
 */
export function FinanceTeaser({
  price,
  assumptions,
  className = "",
}: {
  price: number;
  assumptions: FinanceAssumptions;
  className?: string;
}) {
  const result = estimateFor(price, assumptions);
  if (!result) return null;

  const terms = [
    assumptions.depositPercent > 0
      ? `a ${percent(assumptions.depositPercent)} deposit`
      : "no deposit",
    assumptions.balloonPercent > 0 ? `a ${percent(assumptions.balloonPercent)} balloon` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <div className={`rounded-md bg-subtle px-4 py-3 text-sm text-body ${className}`}>
      <p>
        Estimated{" "}
        <span className="font-semibold whitespace-nowrap text-heading tabular">
          {formatMonthly(result.monthlyInstalment)}
        </span>{" "}
        over {assumptions.termMonths} months with {terms}. Total cost of credit{" "}
        <span className="font-semibold whitespace-nowrap text-heading tabular">
          {formatRand(result.totalCostOfCredit)}
        </span>
        .
      </p>
      <a href="#finance" className="rn-link mt-1 inline-flex min-h-6 items-center">
        See the full estimate
      </a>
    </div>
  );
}

/**
 * The finance estimate.
 *
 * A white panel with the instalment and the total cost of credit side by side, the assumptions
 * under them, and the disclaimer at the foot. The numbers are server rendered from the CMS
 * defaults, and FinanceEstimator layers a deposit and a term control on top once it has mounted.
 *
 * Four things here are compliance rather than design, and none of them are optional:
 *
 * 1. The word "estimate" comes before the number, not in small print after it. A quotation under
 *    the National Credit Act is a specific thing with specific obligations, and Rynet is not a
 *    credit provider.
 * 2. The total cost of credit sits beside the instalment at the same size. A monthly figure on
 *    its own is how a buyer ends up in a deal they cannot carry.
 * 3. The assumptions are stated, fees included, so the figure can be checked rather than trusted.
 * 4. The disclaimer renders in full, with the one "Requires legal review" marker above it until an
 *    attorney has signed the wording off (see disclaimerFrom).
 *
 * Nothing renders when the calculator refuses the input: no figure is better than a broken one
 * next to a price.
 */
export function FinancePanel({ price, defaults }: { price: number; defaults: FinanceDefault }) {
  const assumptions = assumptionsFrom(defaults);
  if (!estimateFor(price, assumptions)) return null;

  const disclaimer = disclaimerFrom(defaults);

  return (
    <section id="finance" aria-labelledby="finance-heading" className="rn-panel p-5 sm:p-8">
      <h2 id="finance-heading" className="text-xl font-bold text-heading">
        What it might cost a month
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        An estimate, not a quotation. What you are offered depends on a credit assessment.
      </p>

      <FinanceEstimator price={price} assumptions={assumptions} />

      {disclaimer.text ? (
        <div className="mt-6 border-t border-line pt-5">
          <LegalReviewMarker reviewedAt={disclaimer.reviewedAt} className="mb-2" />
          <p className="text-xs text-muted">{disclaimer.text}</p>
        </div>
      ) : null}
    </section>
  );
}
