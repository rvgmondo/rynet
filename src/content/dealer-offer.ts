/**
 * What Rynet offers a dealership to list, in one place.
 *
 * The page at /list-your-stock, the WhatsApp scripts in docs/DEALER-OUTREACH.md and the sign-up
 * confirmation all say this the same way. Change the terms here and the site follows.
 *
 * THE DECISION BEHIND IT. Everything is free while Rynet launches, the same offer that MotoHubSA
 * makes motorcycle dealers: we create the dealership, load every car, keep them up to date and
 * make their ads, with no contract and no card. A dealership already lists on three other sites
 * and will not retype its floor for a fourth, so the offer removes every reason to say no.
 *
 * Never put a buyer number, a traffic figure or a count of dealerships here. Rynet has none worth
 * quoting yet, and a number a dealership later finds out was invented ends the relationship.
 */

export const DEALER_OFFER = {
  /** Shown as the price. */
  price: "Free while we launch",
  /** One line under the headline. */
  promise:
    "We load every car ourselves, keep them up to date and make your social ads. You don't send or type a thing. No contract.",
  /** What happens to the price later, said plainly. */
  later:
    "Listing is free while Rynet launches. If that ever changes you will hear from us well before, and you decide whether to stay. There is no contract to get out of.",
  whatsapp: null as string | null,
} as const;
