/**
 * Vehicle finance estimates.
 *
 * South African vehicle credit sits under the National Credit Act. A wrong instalment
 * shown beside a price is a compliance problem, not a display bug, so three rules apply to
 * everything in this file:
 *
 * 1. **It is an estimate, never a quotation.** A quotation under the NCA is a specific thing
 *    with specific obligations, and Rynet is not a credit provider. Every caller must render
 *    the disclaimer from `finance-defaults` alongside the number.
 * 2. **Total cost of credit is always available.** Showing a monthly figure without what the
 *    credit actually costs is how a buyer ends up in a deal they cannot carry.
 * 3. **The rate is not hardcoded.** Prime lives in the CMS so an admin updates it the day the
 *    SARB moves it, rather than waiting for a deploy.
 *
 * The maths is the standard annuity formula with a future value, which is what a balloon
 * payment is: an amount still owing at the end of the term.
 *
 *              r * (PV * (1 + r)^n  -  FV)
 *   payment = ------------------------------
 *                    (1 + r)^n  -  1
 *
 * where PV is the amount financed, FV the balloon, r the monthly rate and n the term.
 */

export type FinanceInput = {
  /** Cash price of the vehicle, in rand. */
  price: number;
  /** Deposit in rand. Not a percentage: the caller converts, so a buyer can type an amount. */
  deposit?: number;
  /** Term in months. 72 is the common maximum in this market. */
  termMonths: number;
  /** Annual interest rate as a percentage, so 12 means 12 percent. */
  annualRatePercent: number;
  /** Balloon as a percentage of the cash price, still owing at the end of the term. */
  balloonPercent?: number;
  /** Once-off initiation fee, capped by the NCA. Financed rather than paid up front. */
  initiationFee?: number;
  /** Monthly service fee, capped by the NCA. Added to every instalment. */
  monthlyServiceFee?: number;
};

export type FinanceResult = {
  /** What the buyer pays each month, including the service fee. */
  monthlyInstalment: number;
  /**
   * The last instalment, which absorbs the rounding.
   *
   * An instalment is rounded to the cent, and multiplying that by the term does not land
   * exactly on the balance. Real credit agreements settle the difference in the final
   * payment, and modelling it that way is not pedantry: without it, an interest-free deal
   * reports a cost of credit of minus four cents, and a negative cost of credit printed
   * beside a price is the sort of thing that ends up in a complaint.
   */
  finalInstalment: number;
  /** The instalment before the service fee, which is the part interest is charged on. */
  principalAndInterest: number;
  /** Amount financed: price, less deposit, plus the initiation fee. */
  amountFinanced: number;
  /** Still owing at the end of the term. Zero unless a balloon was set. */
  balloonAmount: number;
  /** Every rand the buyer hands over: deposit, all instalments, and the balloon. */
  totalRepayable: number;
  /**
   * What the credit costs, which is everything paid above the cash price. The number the
   * NCA cares about and the one a monthly figure alone hides.
   */
  totalCostOfCredit: number;
  /** Interest alone, excluding fees. Useful for showing where the cost comes from. */
  totalInterest: number;
};

/** Rounds to whole cents, so repeated arithmetic cannot drift. */
const cents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Calculates an estimated instalment.
 *
 * Throws on input that cannot produce a meaningful answer rather than returning NaN or a
 * negative instalment. A calculator that silently shows nonsense next to a price is worse
 * than one that refuses.
 */
export function calculateFinance(input: FinanceInput): FinanceResult {
  const {
    price,
    deposit = 0,
    termMonths,
    annualRatePercent,
    balloonPercent = 0,
    initiationFee = 0,
    monthlyServiceFee = 0,
  } = input;

  if (!Number.isFinite(price) || price <= 0) {
    throw new RangeError("Price must be a positive amount.");
  }
  if (!Number.isFinite(termMonths) || termMonths < 1 || !Number.isInteger(termMonths)) {
    throw new RangeError("Term must be a whole number of months, at least one.");
  }
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new RangeError("Interest rate cannot be negative.");
  }
  if (deposit < 0 || deposit >= price) {
    throw new RangeError("Deposit must be less than the price, and cannot be negative.");
  }
  if (balloonPercent < 0 || balloonPercent >= 100) {
    throw new RangeError("Balloon must be between 0 and 100 percent of the price.");
  }

  const balloonAmount = cents((price * balloonPercent) / 100);
  const amountFinanced = cents(price - deposit + initiationFee);

  if (balloonAmount >= amountFinanced) {
    // The balloon would exceed what is being financed, so there is nothing to amortise and
    // the instalment would come out negative. Refuse rather than display it.
    throw new RangeError("The balloon is larger than the amount financed. Reduce it.");
  }

  const monthlyRate = annualRatePercent / 100 / 12;

  let principalAndInterest: number;
  if (monthlyRate === 0) {
    // Interest-free. The annuity formula divides by zero here, so handle it directly:
    // the amortising portion is simply spread evenly across the term.
    principalAndInterest = (amountFinanced - balloonAmount) / termMonths;
  } else {
    const growth = (1 + monthlyRate) ** termMonths;
    principalAndInterest = (monthlyRate * (amountFinanced * growth - balloonAmount)) / (growth - 1);
  }

  // The exact instalment, before rounding. Kept so the totals do not accumulate the
  // rounding error once per month across a 72 month term.
  const exactPrincipalAndInterest = principalAndInterest;

  principalAndInterest = cents(exactPrincipalAndInterest);
  const monthlyInstalment = cents(principalAndInterest + monthlyServiceFee);

  // What the schedule actually owes, using the exact figure.
  const exactTotalInstalments = cents((exactPrincipalAndInterest + monthlyServiceFee) * termMonths);
  // The final payment absorbs the difference between the rounded instalments and that.
  const finalInstalment = cents(exactTotalInstalments - monthlyInstalment * (termMonths - 1));

  const totalRepayable = cents(
    deposit + monthlyInstalment * (termMonths - 1) + finalInstalment + balloonAmount,
  );
  const totalCostOfCredit = cents(totalRepayable - price);
  const totalInterest = cents(
    exactPrincipalAndInterest * termMonths + balloonAmount - amountFinanced,
  );

  return {
    monthlyInstalment,
    finalInstalment,
    principalAndInterest,
    amountFinanced,
    balloonAmount,
    totalRepayable,
    totalCostOfCredit,
    totalInterest,
  };
}

/**
 * The defaults a listing page uses before a buyer touches anything.
 *
 * Reads from the `finance-defaults` global, which is why the shape is loose: the caller
 * passes what it has and this fills the gaps. Prime plus an offset, because almost nobody
 * is offered prime on a used vehicle.
 */
export function defaultEstimate(
  price: number,
  defaults: {
    primeRatePercent?: number | null;
    defaultRateOffsetPercent?: number | null;
    defaultTermMonths?: number | null;
    defaultDepositPercent?: number | null;
    defaultBalloonPercent?: number | null;
    initiationFee?: number | null;
    monthlyServiceFee?: number | null;
  },
): FinanceResult {
  const prime = defaults.primeRatePercent ?? 10.5;
  const offset = defaults.defaultRateOffsetPercent ?? 1.5;
  const depositPercent = defaults.defaultDepositPercent ?? 10;

  return calculateFinance({
    price,
    deposit: (price * depositPercent) / 100,
    termMonths: defaults.defaultTermMonths ?? 72,
    annualRatePercent: prime + offset,
    balloonPercent: defaults.defaultBalloonPercent ?? 0,
    initiationFee: defaults.initiationFee ?? 0,
    monthlyServiceFee: defaults.monthlyServiceFee ?? 0,
  });
}
