import type { LucideIcon } from "lucide-react";
import { CalendarClock, KeyRound, ReceiptText } from "lucide-react";

/**
 * Copy and constants the agency pages share, so one sentence is written once.
 *
 * Nothing here is a claim about results. Rynet Digital has no clients yet, so every line is
 * either how we work, what a dealer gets, or a term we will put in the contract. The terms
 * come straight from the pricing questions in src/content/agency/pricing.ts and must stay in
 * step with them.
 */

/** The one primary action on the agency site. Same label everywhere, same destination. */
export const REVIEW_CTA = {
  href: "/digital/contact",
  label: "Book a free review",
  /** For the header on a phone, where the full label does not fit beside the menu. */
  short: "Free review",
} as const;

export const AGENCY_EMAIL = "digital@rynet.co.za";

/** Routes that exist. /digital/work stays out until there is real client work to show. */
export const AGENCY_NAV = [
  { href: "/digital/services", label: "Services" },
  { href: "/digital/process", label: "How we work" },
  { href: "/digital/pricing", label: "Pricing" },
  { href: "/digital/about", label: "About" },
] as const;

/** What happens after someone asks for the review. Also the promise the form makes. */
export const NEXT_STEPS = [
  {
    title: "We confirm what we are looking at",
    body: "A reply to say what we will review, and a request for read only access if you have analytics or ad accounts.",
  },
  {
    title: "You get the written review",
    body: "In writing: what is slowing your site down, what is stopping it being found, and what we would fix first.",
  },
  {
    title: "We go through it together, if it helps",
    body: "A call about the review. No obligation, and if the answer is that you do not need us yet, the review says so.",
  },
] as const;

/** The commercial terms, as they appear in the pricing questions. */
export const TERMS: readonly { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ReceiptText,
    title: "A fixed fee for managing ads",
    body: "Paid media management is a fixed monthly fee, never a percentage of your ad spend. Your media budget goes to the platform.",
  },
  {
    icon: KeyRound,
    title: "You own what we build",
    body: "The code, the domain and the accounts are yours. If you leave, the site goes with you and keeps working.",
  },
  {
    icon: CalendarClock,
    title: "Month to month after three",
    body: "Monthly work runs month to month after the first three months, on thirty days notice.",
  },
];

/**
 * The five stages of an engagement. The process page shows all of it; the home page the first line.
 *
 * `duration` is optional and only set where it is a term rather than a turnaround. How long the
 * review, the call or the first build takes is a commitment the owner has not made yet
 * (docs/CONTENT-NEEDED.md section 8), so no stage states one.
 */
export const STAGES = [
  {
    name: "The review",
    duration: "Free",
    short:
      "We look at your site, stock feed, Google profile and ads, and write down what is wrong.",
    what: "We look at your site, your stock feed, your Google Business Profile and whatever advertising you are running. You get a written list of what is wrong, in priority order, with effort set against impact.",
    you: "Send us the web address and, if you have them, read only access to your analytics and ad accounts. Nothing else.",
  },
  {
    name: "The call",
    duration: null,
    short: "We agree what matters this year. The scope and figure follow in writing.",
    what: "We go through the review together and agree what actually matters to you this year. You get a scope and a figure in writing afterwards, not on the call.",
    you: "Bring whoever makes the decision. A call without them is a call that has to happen twice.",
  },
  {
    name: "The first slice",
    duration: null,
    short:
      "The smallest piece that works on its own, usually the stock feed or the site, goes live.",
    what: "We build the smallest thing that produces a result on its own, and ship it. Usually that is the stock feed or the site, because everything else is worth less until the stock is correct.",
    you: "One person who can answer questions within a day. Slow answers are what make a build run long.",
  },
  {
    name: "Measure",
    duration: "From the day it goes live",
    short: "Lead tracking end to end, and a baseline recorded before anything else changes.",
    what: "Lead tracking end to end, and a baseline recorded before we change anything else. Without a baseline, everything after this is opinion.",
    you: "Tell us when a lead turned into a sale. That is the number we cannot see, and it is the one that matters.",
  },
  {
    name: "The month",
    duration: "Ongoing, month to month after the first three",
    short: "One page a month: spend, leads, cost per lead, and what we recommend next.",
    what: "A one page report: spend, leads, cost per lead and what moved. A written recommendation for the coming month, and what we got wrong in the last one.",
    you: "Read one page and tell us if the recommendation is wrong. You know your floor better than we do.",
  },
] as const satisfies readonly {
  name: string;
  duration: string | null;
  short: string;
  what: string;
  you: string;
}[];

/** Adds the full stop some content strings were written without. */
export function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
