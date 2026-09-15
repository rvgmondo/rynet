"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Field, Select } from "@/components/ui/field";
import { PriceTag } from "@/components/ui/price-tag";
import { formatRand } from "@/lib/format";

import { estimateFor, type FinanceAssumptions, percent } from "./finance-estimate";

/**
 * The adjustable part of the finance estimate. A progressive-enhancement island.
 *
 * The server renders this with the CMS defaults, so the instalment, the cost of credit and every
 * assumption are in the HTML before any script runs. The two selects only appear once the
 * component has mounted: a control that does nothing without JavaScript is worse than no control,
 * and without JavaScript the defaults are still a complete, checkable estimate.
 *
 * The maths is the same pure calculateFinance the server uses, so moving the deposit or the term
 * costs no request. Both headline figures sit in one polite live region and change together,
 * because the cost of credit is the number a longer term quietly inflates and it must never lag
 * behind the instalment it belongs to. They sit side by side at every width, at the same size.
 *
 * The interest rate is always stated under them. The rest of the working (amount financed, fees,
 * balloon, total repayable) is in a native disclosure, open with one tap and with no JavaScript,
 * because six ruled rows made the panel a full phone screen on its own.
 */
const DEPOSITS = [0, 10, 20, 30];
const TERMS = [36, 48, 60, 72];

function withDefault(options: number[], value: number): number[] {
  return [...new Set([...options, value])].sort((a, b) => a - b);
}

export function FinanceEstimator({
  price,
  assumptions,
}: {
  price: number;
  assumptions: FinanceAssumptions;
}) {
  const [mounted, setMounted] = useState(false);
  const [depositPercent, setDepositPercent] = useState(assumptions.depositPercent);
  const [termMonths, setTermMonths] = useState(assumptions.termMonths);
  const id = useId();

  useEffect(() => setMounted(true), []);

  const result = estimateFor(price, assumptions, depositPercent, termMonths);
  const deposit = (price * depositPercent) / 100;

  const rows = result
    ? [
        {
          label: "Deposit",
          value:
            depositPercent === 0 ? "None" : `${formatRand(deposit)} (${percent(depositPercent)})`,
        },
        { label: "Term", value: `${termMonths} months` },
        {
          label: "Interest rate",
          value: `${percent(assumptions.ratePercent)} (prime ${percent(assumptions.primeRatePercent)} plus ${percent(assumptions.offsetPercent)})`,
        },
        { label: "Amount financed", value: formatRand(result.amountFinanced) },
        ...(assumptions.initiationFee > 0
          ? [{ label: "Initiation fee, financed", value: formatRand(assumptions.initiationFee) }]
          : []),
        ...(assumptions.monthlyServiceFee > 0
          ? [
              {
                label: "Service fee, in each instalment",
                value: formatRand(assumptions.monthlyServiceFee),
              },
            ]
          : []),
        ...(result.balloonAmount > 0
          ? [{ label: "Balloon at the end", value: formatRand(result.balloonAmount) }]
          : []),
        { label: "Total repayable", value: formatRand(result.totalRepayable) },
      ]
    : [];

  return (
    <div>
      {mounted ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-deposit`} label="Deposit">
            <Select
              value={depositPercent}
              onChange={(event) => setDepositPercent(Number(event.target.value))}
            >
              {withDefault(DEPOSITS, assumptions.depositPercent).map((option) => (
                <option key={option} value={option}>
                  {option === 0
                    ? "No deposit"
                    : `${percent(option)}, ${formatRand((price * option) / 100)}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={`${id}-term`} label="Term">
            <Select
              value={termMonths}
              onChange={(event) => setTermMonths(Number(event.target.value))}
            >
              {withDefault(TERMS, assumptions.termMonths).map((option) => (
                <option key={option} value={option}>
                  {option} months
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <div aria-live="polite" className="mt-6">
        {result ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-md bg-subtle p-3.5 sm:p-5">
              <p className="text-sm font-medium text-muted">Estimated instalment</p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                <PriceTag as="span" value={result.monthlyInstalment} size="lg" />
                <span className="text-sm font-semibold text-muted">pm</span>
              </p>
            </div>
            <div className="rounded-md bg-subtle p-3.5 sm:p-5">
              <p className="text-sm font-medium text-muted">Total cost of the credit</p>
              <PriceTag value={result.totalCostOfCredit} size="lg" className="mt-1.5" />
              <p className="mt-1 text-xs text-muted">
                On top of the <span className="whitespace-nowrap">{formatRand(price)}</span> price
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-md bg-subtle p-5 text-sm text-body">
            That combination cannot be estimated honestly. Try a different deposit or term.
          </p>
        )}
      </div>

      {rows.length > 0 ? (
        <>
          <dl className="mt-5 text-sm">
            {rows
              .filter((row) => row.label === "Interest rate")
              .map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-t border-line py-3"
                >
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right font-semibold text-heading tabular">{row.value}</dd>
                </div>
              ))}
          </dl>
          <details className="group border-t border-line">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-heading [&::-webkit-details-marker]:hidden">
              See the breakdown
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <dl className="grid gap-x-10 pb-2 text-sm sm:grid-cols-2">
              {rows
                .filter((row) => row.label !== "Interest rate")
                .map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-t border-line py-3"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="text-right font-semibold text-heading tabular">{row.value}</dd>
                  </div>
                ))}
            </dl>
          </details>
        </>
      ) : null}
    </div>
  );
}
