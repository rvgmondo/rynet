import { calculateFinance } from "@/lib/finance";
import { formatRand } from "@/lib/format";
import type { FinanceDefault } from "@/payload-types";

/**
 * The finance estimate.
 *
 * Server rendered from the defaults in the CMS, so the figure is in the HTML rather than
 * appearing after hydration. The interactive calculator, where a buyer moves the deposit
 * and term, layers on top of this later; it does not replace it.
 *
 * Four things here are compliance rather than design, and none of them are optional:
 *
 * 1. **The word "estimate" appears before the number**, not after it in small print. A
 *    quotation under the National Credit Act is a specific thing with specific obligations,
 *    and Rynet is not a credit provider.
 * 2. **Total cost of credit is shown next to the instalment**, at the same weight. A
 *    monthly figure on its own is how a buyer ends up in a deal they cannot carry, and it
 *    is the number a long term quietly inflates.
 * 3. **The assumptions are stated**, so the figure can be checked rather than trusted.
 * 4. **The disclaimer renders in full.** It is a required field on the global that cannot be
 *    emptied, and it ships marked as requiring legal review until an attorney has read it.
 */
export function FinancePanel({ price, defaults }: { price: number; defaults: FinanceDefault }) {
  const prime = defaults.primeRatePercent ?? 10.5;
  const offset = defaults.defaultRateOffsetPercent ?? 1.5;
  const rate = prime + offset;
  const term = defaults.defaultTermMonths ?? 72;
  const depositPercent = defaults.defaultDepositPercent ?? 10;
  const deposit = (price * depositPercent) / 100;

  let estimate: ReturnType<typeof calculateFinance> | null = null;
  try {
    estimate = calculateFinance({
      price,
      deposit,
      termMonths: term,
      annualRatePercent: rate,
      balloonPercent: defaults.defaultBalloonPercent ?? 0,
      initiationFee: defaults.initiationFee ?? 0,
      monthlyServiceFee: defaults.monthlyServiceFee ?? 0,
    });
  } catch {
    // The calculator refuses input it cannot answer honestly. Showing nothing is correct;
    // showing a broken number beside a price is not.
    return null;
  }

  return (
    <section aria-labelledby="finance-heading" className="rounded-lg border border-line p-5">
      <h2 id="finance-heading" className="text-2xl">
        What it might cost a month
      </h2>
      <p className="measure mt-1 text-sm text-ink-secondary">
        An estimate, not a quotation. What you are actually offered depends on a credit assessment.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-md bg-surface-sunken p-4">
          <p className="text-xs font-medium uppercase tracking-[var(--tracking-wide)] text-ink-muted">
            Estimated instalment
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular">
            {formatRand(estimate.monthlyInstalment)}
            <span className="ml-1 text-base font-bold text-ink-secondary">pm</span>
          </p>
        </div>

        {/*
          Same visual weight as the instalment, deliberately. Putting the cost of credit in
          a footnote is how a monthly figure gets to look like the whole story.
        */}
        <div className="rounded-md bg-surface-sunken p-4">
          <p className="text-xs font-medium uppercase tracking-[var(--tracking-wide)] text-ink-muted">
            Total cost of the credit
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular">
            {formatRand(estimate.totalCostOfCredit)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">On top of the {formatRand(price)} price</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-8 gap-y-0 text-sm sm:grid-cols-2">
        {[
          { label: "Deposit", value: `${formatRand(deposit)} (${depositPercent}%)` },
          { label: "Term", value: `${term} months` },
          {
            label: "Interest rate",
            value: `${rate.toFixed(2)}% (prime ${prime}% plus ${offset}%)`,
          },
          { label: "Amount financed", value: formatRand(estimate.amountFinanced) },
          ...(estimate.balloonAmount > 0
            ? [{ label: "Balloon at the end", value: formatRand(estimate.balloonAmount) }]
            : []),
          { label: "Total repayable", value: formatRand(estimate.totalRepayable) },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 border-b border-line py-2 last:border-0"
          >
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="text-right font-medium tabular">{row.value}</dd>
          </div>
        ))}
      </dl>

      {defaults.disclaimer ? (
        <p className="measure mt-5 border-t border-line pt-4 text-xs text-ink-muted">
          {defaults.disclaimer}
        </p>
      ) : null}
    </section>
  );
}
