/**
 * The identities the adversarial isolation suite uses.
 *
 * A plain constants module with no side effects, because both the script that creates these
 * accounts and the test suite that attacks them need the same strings, and the script has to
 * be able to refuse to run in production at import time. Importing a module that calls
 * process.exit is not something a test file should do.
 *
 * Every address is on `.test`, which RFC 2606 reserves permanently. No DNS resolves it, so
 * one of these escaping into a mail queue dead-ends rather than reaching a stranger.
 */

/** Written down on purpose. The script that uses it refuses to run in production. */
export const FIXTURE_PASSWORD = "IsolationTest!2026";

export const FIXTURES = {
  /** Dealer A. The attacker in every test in the suite. */
  ownerA: "owner-a@rynet.test",
  salesA: "sales-a@rynet.test",
  /** Dealer B. The victim. Its leads are what dealer A must never see. */
  ownerB: "owner-b@rynet.test",
  /** A consumer account. The one that must never be able to list a vehicle. */
  buyer: "buyer@rynet.test",
  /**
   * Its own account for the two-factor suite, which enrols and unenrols as it runs.
   * Sharing one with the isolation suite would mean whichever ran second signed in against
   * a second factor it did not know about.
   */
  twoFactor: "twofactor@rynet.test",
  /** Distinctive enough that a test can assert on the string and mean it. */
  /** A trade-in disclosed to dealer A only. Dealer B must never see it. */
  leadNameA: "Isolation Fixture Lead A",
  leadNameB: "Isolation Fixture Lead B",
  tradeInLeadName: "Isolation Fixture Trade In A",
} as const;

export const DEALER_A_SLUG = "highveld-motor-group";
export const DEALER_B_SLUG = "cape-peninsula-auto";
