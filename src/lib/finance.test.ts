import { describe, expect, it } from "vitest";

import { calculateFinance, defaultEstimate } from "./finance";

/**
 * The finance calculator gets the most thorough tests in the codebase, because a wrong
 * instalment shown beside a price is a National Credit Act problem rather than a bug.
 *
 * The expected values are computed independently from the annuity formula, not recorded
 * from this implementation's output. A test that asserts what the code already does proves
 * only that the code has not changed.
 */

/** Independent reference implementation, written from the formula rather than the source. */
function referencePayment(pv: number, fv: number, rate: number, n: number): number {
  if (rate === 0) return (pv - fv) / n;
  const g = (1 + rate) ** n;
  return (rate * (pv * g - fv)) / (g - 1);
}

describe("calculateFinance, against the formula", () => {
  it("matches an independent calculation on a plain amortising loan", () => {
    const result = calculateFinance({
      price: 300000,
      deposit: 0,
      termMonths: 60,
      annualRatePercent: 12,
    });
    const expected = referencePayment(300000, 0, 0.01, 60);
    expect(result.principalAndInterest).toBeCloseTo(expected, 2);
    // R 300 000 over 60 months at 12 percent is a shade under R 6 700.
    expect(result.principalAndInterest).toBeCloseTo(6673.34, 1);
  });

  it("matches an independent calculation with a balloon", () => {
    const result = calculateFinance({
      price: 400000,
      deposit: 40000,
      termMonths: 72,
      annualRatePercent: 12,
      balloonPercent: 30,
    });
    // Financed 360 000, balloon 120 000, 1 percent a month, 72 months.
    const expected = referencePayment(360000, 120000, 0.01, 72);
    expect(result.principalAndInterest).toBeCloseTo(expected, 2);
  });

  it("handles a zero interest rate without dividing by zero", () => {
    const result = calculateFinance({
      price: 120000,
      termMonths: 12,
      annualRatePercent: 0,
    });
    // Interest free: the whole amount spread evenly.
    expect(result.principalAndInterest).toBeCloseTo(10000, 2);
    expect(result.totalInterest).toBeCloseTo(0, 2);
  });

  it("spreads a zero-rate loan correctly when there is also a balloon", () => {
    const result = calculateFinance({
      price: 100000,
      termMonths: 10,
      annualRatePercent: 0,
      balloonPercent: 20,
    });
    // 100 000 financed, 20 000 owing at the end, so 8 000 a month for ten months.
    expect(result.principalAndInterest).toBeCloseTo(8000, 2);
    expect(result.balloonAmount).toBeCloseTo(20000, 2);
  });
});

describe("the numbers a buyer is actually shown", () => {
  it("adds the monthly service fee to the instalment but not to the interest", () => {
    const withoutFee = calculateFinance({
      price: 300000,
      termMonths: 60,
      annualRatePercent: 12,
    });
    const withFee = calculateFinance({
      price: 300000,
      termMonths: 60,
      annualRatePercent: 12,
      monthlyServiceFee: 69,
    });

    expect(withFee.monthlyInstalment).toBeCloseTo(withoutFee.monthlyInstalment + 69, 2);
    // The service fee is not interest, so it must not change that figure.
    expect(withFee.principalAndInterest).toBeCloseTo(withoutFee.principalAndInterest, 2);
    // It does cost the buyer money, so it must show up in the cost of credit.
    expect(withFee.totalCostOfCredit).toBeCloseTo(withoutFee.totalCostOfCredit + 69 * 60, 1);
  });

  it("finances the initiation fee rather than treating it as paid up front", () => {
    const result = calculateFinance({
      price: 300000,
      termMonths: 60,
      annualRatePercent: 12,
      initiationFee: 1207.5,
    });
    expect(result.amountFinanced).toBeCloseTo(301207.5, 2);
  });

  it("counts everything the buyer hands over in the total repayable", () => {
    const result = calculateFinance({
      price: 300000,
      deposit: 30000,
      termMonths: 60,
      annualRatePercent: 12,
      balloonPercent: 20,
      monthlyServiceFee: 69,
    });
    const expected =
      30000 + result.monthlyInstalment * 59 + result.finalInstalment + result.balloonAmount;
    expect(result.totalRepayable).toBeCloseTo(expected, 2);
  });

  it("reports the cost of credit as everything paid above the cash price", () => {
    const result = calculateFinance({
      price: 300000,
      deposit: 30000,
      termMonths: 60,
      annualRatePercent: 12,
    });
    expect(result.totalCostOfCredit).toBeCloseTo(result.totalRepayable - 300000, 2);
    // Six percent a year over five years is real money, and the buyer should see it.
    expect(result.totalCostOfCredit).toBeGreaterThan(80000);
  });

  it("costs nothing when the credit is free", () => {
    // R 100 000 over 12 months divides to 8333.33 a month, which times twelve is four
    // cents short. Before the final instalment absorbed that, this reported a cost of
    // credit of MINUS four cents, which is not a thing that can appear beside a price.
    const result = calculateFinance({ price: 100000, termMonths: 12, annualRatePercent: 0 });
    expect(result.totalCostOfCredit).toBeCloseTo(0, 2);
    expect(result.totalCostOfCredit).toBeGreaterThanOrEqual(0);
  });

  it("settles the rounding in the final instalment, the way a real agreement does", () => {
    const result = calculateFinance({ price: 100000, termMonths: 12, annualRatePercent: 0 });
    expect(result.monthlyInstalment).toBeCloseTo(8333.33, 2);
    // The last payment carries the four cents.
    expect(result.finalInstalment).toBeCloseTo(8333.37, 2);
  });

  it("never reports a negative cost of credit, at any term or rate", () => {
    for (const termMonths of [12, 24, 36, 48, 60, 72, 84]) {
      for (const annualRatePercent of [0, 0.5, 7.25, 10.5, 13.75, 21]) {
        const r = calculateFinance({ price: 287300, termMonths, annualRatePercent });
        expect(r.totalCostOfCredit).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("the relationships a buyer expects to hold", () => {
  const base = { price: 350000, termMonths: 60, annualRatePercent: 13.5 };

  it("lowers the instalment as the deposit rises", () => {
    const none = calculateFinance({ ...base, deposit: 0 });
    const some = calculateFinance({ ...base, deposit: 50000 });
    const more = calculateFinance({ ...base, deposit: 100000 });
    expect(some.monthlyInstalment).toBeLessThan(none.monthlyInstalment);
    expect(more.monthlyInstalment).toBeLessThan(some.monthlyInstalment);
  });

  it("lowers the instalment as the term lengthens, and raises the total cost", () => {
    const short = calculateFinance({ ...base, termMonths: 36 });
    const long = calculateFinance({ ...base, termMonths: 72 });
    expect(long.monthlyInstalment).toBeLessThan(short.monthlyInstalment);
    // The trap in a long term, and the reason cost of credit is shown at all.
    expect(long.totalCostOfCredit).toBeGreaterThan(short.totalCostOfCredit);
  });

  it("lowers the instalment as the balloon rises, and raises the total cost", () => {
    const none = calculateFinance({ ...base, balloonPercent: 0 });
    const big = calculateFinance({ ...base, balloonPercent: 35 });
    expect(big.monthlyInstalment).toBeLessThan(none.monthlyInstalment);
    expect(big.totalCostOfCredit).toBeGreaterThan(none.totalCostOfCredit);
  });

  it("raises the instalment as the rate rises", () => {
    const low = calculateFinance({ ...base, annualRatePercent: 9 });
    const high = calculateFinance({ ...base, annualRatePercent: 18 });
    expect(high.monthlyInstalment).toBeGreaterThan(low.monthlyInstalment);
  });
});

describe("input it must refuse rather than answer badly", () => {
  const base = { price: 300000, termMonths: 60, annualRatePercent: 12 };

  it("refuses a price that is zero, negative or not a number", () => {
    for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculateFinance({ ...base, price })).toThrow(RangeError);
    }
  });

  it("refuses a deposit at or above the price", () => {
    expect(() => calculateFinance({ ...base, deposit: 300000 })).toThrow(RangeError);
    expect(() => calculateFinance({ ...base, deposit: 400000 })).toThrow(RangeError);
    expect(() => calculateFinance({ ...base, deposit: -1 })).toThrow(RangeError);
  });

  it("refuses a term that is zero, fractional or negative", () => {
    for (const termMonths of [0, -12, 60.5, Number.NaN]) {
      expect(() => calculateFinance({ ...base, termMonths })).toThrow(RangeError);
    }
  });

  it("refuses a negative interest rate", () => {
    expect(() => calculateFinance({ ...base, annualRatePercent: -1 })).toThrow(RangeError);
  });

  it("refuses a balloon of 100 percent or more", () => {
    expect(() => calculateFinance({ ...base, balloonPercent: 100 })).toThrow(RangeError);
    expect(() => calculateFinance({ ...base, balloonPercent: -5 })).toThrow(RangeError);
  });

  it("refuses a balloon larger than the amount financed, rather than returning a negative instalment", () => {
    // A big deposit shrinks what is financed; a big balloon can then exceed it entirely.
    expect(() =>
      calculateFinance({
        price: 300000,
        deposit: 250000,
        termMonths: 60,
        annualRatePercent: 12,
        balloonPercent: 50,
      }),
    ).toThrow(RangeError);
  });

  it("never returns a negative or non-finite instalment for any accepted input", () => {
    for (const price of [50000, 300000, 1500000]) {
      for (const termMonths of [12, 36, 60, 72, 84]) {
        for (const annualRatePercent of [0, 7.5, 10.5, 13.5, 22]) {
          for (const balloonPercent of [0, 10, 35]) {
            const r = calculateFinance({
              price,
              deposit: price * 0.1,
              termMonths,
              annualRatePercent,
              balloonPercent,
              initiationFee: 1207.5,
              monthlyServiceFee: 69,
            });
            expect(Number.isFinite(r.monthlyInstalment)).toBe(true);
            expect(r.monthlyInstalment).toBeGreaterThan(0);
            expect(r.totalCostOfCredit).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});

describe("defaultEstimate", () => {
  it("uses prime plus the offset, because almost nobody is offered prime on a used car", () => {
    const withDefaults = defaultEstimate(300000, {
      primeRatePercent: 10.5,
      defaultRateOffsetPercent: 1.5,
      defaultTermMonths: 72,
      defaultDepositPercent: 10,
      defaultBalloonPercent: 0,
      initiationFee: 1207.5,
      monthlyServiceFee: 69,
    });
    const explicit = calculateFinance({
      price: 300000,
      deposit: 30000,
      termMonths: 72,
      annualRatePercent: 12,
      balloonPercent: 0,
      initiationFee: 1207.5,
      monthlyServiceFee: 69,
    });
    expect(withDefaults.monthlyInstalment).toBeCloseTo(explicit.monthlyInstalment, 2);
  });

  it("falls back to the August 2026 prime when the global has not been set", () => {
    // 10.5 on a 7.00 repo, effective 28 May 2026. If the global is empty the estimate must
    // still be sane rather than NaN.
    const result = defaultEstimate(300000, {});
    expect(result.monthlyInstalment).toBeGreaterThan(0);
    expect(Number.isFinite(result.monthlyInstalment)).toBe(true);
  });

  it("tolerates nulls from the CMS, which is what an unset field returns", () => {
    const result = defaultEstimate(250000, {
      primeRatePercent: null,
      defaultRateOffsetPercent: null,
      defaultTermMonths: null,
      defaultDepositPercent: null,
      defaultBalloonPercent: null,
      initiationFee: null,
      monthlyServiceFee: null,
    });
    expect(result.monthlyInstalment).toBeGreaterThan(0);
  });
});
