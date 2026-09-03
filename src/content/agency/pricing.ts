/**
 * How Rynet Digital prices, and the figures it does not have yet.
 *
 * The problem this file solves: every published range would be invented. Nobody at Rynet has
 * agreed a number, there is no delivery history to derive one from, and the brief is
 * explicit that a fabricated figure is out of the question. A placeholder like "from R X"
 * on a live page is the same offence with worse manners.
 *
 * So the bands are typed and set to `null`, the page renders an honest sentence in their
 * place, and filling them in later is an edit to this file rather than a rewrite of the
 * page. Set `from` and the page renders the band instead. Nothing else has to change.
 *
 * Listed in docs/CONTENT-NEEDED.md as an action for Ruben.
 */

export type PriceBand = {
  slug: string;
  name: string;
  /** Who this shape of engagement suits. */
  who: string;
  /** What the money buys. */
  what: string;
  /** How it is charged. */
  basis: "Once off" | "Monthly" | "Once off, then monthly";
  /**
   * Rand, excluding VAT. `null` until a real number exists.
   *
   * Do not put a guess here to make the page look finished. The page reads better with the
   * honest sentence than it does with a number nobody will stand behind on a call.
   */
  from: number | null;
};

export const PRICE_BANDS: readonly PriceBand[] = [
  {
    slug: "website",
    name: "Dealership website",
    who: "A dealership whose current site is slow, hard to search, or wrong about its own stock.",
    what: "Design, build, stock integration, structured data, accessibility, and handover. You own the code and the domain.",
    basis: "Once off, then monthly",
    from: null,
  },
  {
    slug: "feeds",
    name: "Stock feed setup",
    who: "Anyone whose DMS export is not reaching their site and the portals cleanly.",
    what: "Mapping from your actual export, a dry run before anything goes live, error reporting per row, sold detection, and a rollback path.",
    basis: "Once off, then monthly",
    from: null,
  },
  {
    slug: "media",
    name: "Paid media management",
    who: "A dealership already spending on Google or Meta without being able to trace what came back.",
    what: "Campaign build from live stock, lead tracking end to end, and reporting in cost per lead and cost per test drive.",
    basis: "Monthly",
    from: null,
  },
  {
    slug: "retainer",
    name: "Ongoing work",
    who: "A dealership that wants search, content and reporting handled continuously rather than in bursts.",
    what: "An agreed number of hours a month against a written plan, with a one page report and a recommendation each month.",
    basis: "Monthly",
    from: null,
  },
] as const;

/** True while no band carries a real figure, which is what the page branches on. */
export const PRICING_IS_UNPUBLISHED = PRICE_BANDS.every((band) => band.from === null);

export const PRICING_FAQS = [
  {
    question: "Why are there no prices on this page?",
    answer:
      "Because we have not done enough dealership work to quote a range we would stand behind. Publishing one now would mean guessing, and a guessed price is worse than no price: you would plan around it and we would have to revise it. Ask on a call and you will get a real number for your situation.",
  },
  {
    question: "Do you take a percentage of advertising spend?",
    answer:
      "No. A percentage of spend pays us to spend more rather than to spend well, and those are not the same objective. Management is a fixed monthly fee and your media budget goes to the platform.",
  },
  {
    question: "Do I own what you build?",
    answer:
      "Yes. The code, the domain and the accounts are yours. If you leave, you take the site with you and we will hand over cleanly. Nothing we build stops working when you stop paying us.",
  },
  {
    question: "Is there a lock-in contract?",
    answer:
      "Monthly work runs month to month after the first three months, with thirty days notice. The first three exist because nothing we do shows a result inside one month, so a shorter commitment would mean you paying for the setup and leaving before the return.",
  },
  {
    question: "Do agency clients get better placement on Rynet Showroom?",
    answer:
      "No, and they never will. The marketplace ranks and verifies dealerships on the same rules whether they are an agency client or not. A marketplace that sold placement to its own agency clients would not be worth listing on.",
  },
  {
    question: "What does the free review cost, really?",
    answer:
      "Nothing, and it is not a sales call with a report attached. You get what is slowing your site down, what is stopping it being found, and what we would fix first. If the answer is that you do not need us yet, that is what the review will say.",
  },
] as const;
