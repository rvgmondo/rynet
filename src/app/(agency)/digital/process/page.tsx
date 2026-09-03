import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "How we work",
  description:
    "The five stages of a Rynet Digital engagement, what you do at each one, how long it takes, and the two ways it usually goes wrong.",
  alternates: { canonical: "/digital/process" },
};

const STAGES = [
  {
    number: "01",
    name: "The review",
    duration: "Two to three days, free",
    what: "We look at your site, your stock feed, your Google Business Profile and whatever advertising you are running. You get a written list of what is wrong, in priority order, with effort against impact.",
    you: "Send us the URL and, if you have them, access to your analytics and ad accounts in read only. Nothing else.",
  },
  {
    number: "02",
    name: "The call",
    duration: "An hour",
    what: "We go through the review together and agree what actually matters to you this year. You get a scope and a figure in writing afterwards, not on the call.",
    you: "Bring whoever will make the decision. A call without them is a call that has to happen twice.",
  },
  {
    number: "03",
    name: "The first slice",
    duration: "Two to six weeks depending on scope",
    what: "We build the smallest thing that produces a result on its own, and ship it. Usually that is the stock feed or the site, because everything else is worth less until stock is correct.",
    you: "One person who can answer questions inside a day. Delay here is the single biggest cause of a project running long.",
  },
  {
    number: "04",
    name: "Measure",
    duration: "From the day it goes live",
    what: "Lead tracking end to end, and a baseline recorded before we change anything else. Without a baseline, everything after this is opinion.",
    you: "Nothing, except telling us when a lead turned into a sale. That is the number we cannot see and it is the one that matters.",
  },
  {
    number: "05",
    name: "The month",
    duration: "Ongoing, month to month after the first three",
    what: "A one page report: spend, leads, cost per lead, what moved. A written recommendation for the coming month, and what we got wrong in the last one.",
    you: "Read one page and tell us if the recommendation is wrong. You know your floor better than we do.",
  },
] as const;

/**
 * How we work.
 *
 * The section at the bottom is the point of the page. Every agency process page describes
 * the happy path, which is the least useful thing to publish, because a dealer principal has
 * been through this before and knows it goes wrong. Naming the two ways it actually does,
 * and saying which one is our fault, is worth more than another diagram of arrows.
 */
export default function ProcessPage() {
  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/digital/process", label: "How we work" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">How we work</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Five stages. The first one is free and the second one ends with a number in writing. What
          you have to do at each stage is listed, because that is usually the part nobody mentions
          until it is late.
        </p>
      </div>

      <ol className="mt-14 space-y-4">
        {STAGES.map((stage) => (
          <li
            key={stage.number}
            className="grid gap-4 rounded-lg border border-line p-6 md:grid-cols-[auto_1fr] md:gap-8"
          >
            <p
              aria-hidden="true"
              className="font-display text-3xl font-extrabold tabular text-accent md:text-4xl"
            >
              {stage.number}
            </p>

            <div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="text-xl">{stage.name}</h2>
                <p className="text-sm text-ink-muted">{stage.duration}</p>
              </div>

              <p className="measure mt-3 text-ink-secondary">{stage.what}</p>

              <p className="measure mt-4 border-l-2 border-line-interactive pl-4 text-sm text-ink-secondary">
                <span className="font-semibold text-ink">What you do: </span>
                {stage.you}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="wrong-heading" className="mt-[var(--section-base)]">
        <h2 id="wrong-heading" className="text-2xl">
          The two ways this goes wrong
        </h2>
        <p className="measure mt-4 text-ink-secondary">
          Worth saying before you commit rather than after, since you have almost certainly had at
          least one of these happen to you before.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-6">
            <h3 className="text-lg">Approvals stall</h3>
            <p className="mt-3 text-sm text-ink-secondary">
              A question sits for two weeks because the person who can answer it is on the floor
              selling cars, which is where they should be. The build waits, the momentum goes, and
              the eventual launch lands in a month nobody planned for.
            </p>
            <p className="mt-3 text-sm text-ink-secondary">
              What we do about it: one named contact, questions batched rather than trickled, and a
              default. If we do not hear back in three working days we take the sensible option and
              tell you what we chose, so the work keeps moving and you can still change it.
            </p>
            <p className="mt-4 text-2xs font-semibold uppercase tracking-[var(--tracking-wide)] text-ink-muted">
              Usually your side, and it is understandable
            </p>
          </div>

          <div className="rounded-lg border border-line p-6">
            <h3 className="text-lg">The stock feed is worse than it looked</h3>
            <p className="mt-3 text-sm text-ink-secondary">
              The export is missing a field that matters, or encodes derivative and variant in one
              string, or the photographs come through in an order nobody controls. This is the
              normal case in South Africa, not the unlucky one, and it is where estimates break.
            </p>
            <p className="mt-3 text-sm text-ink-secondary">
              What we do about it: we ask for a real export before quoting, not a description of
              one. If we quote without seeing it and it turns out worse, that is our risk and our
              cost, not a variation order.
            </p>
            <p className="mt-4 text-2xs font-semibold uppercase tracking-[var(--tracking-wide)] text-ink-muted">
              Our side to manage
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="process-cta"
        className="mt-[var(--section-base)] rounded-lg bg-surface-sunken p-8"
      >
        <h2 id="process-cta" className="text-2xl">
          Stage one is free
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Send us your site and you get the written review whether or not anything comes of it.
        </p>
        <Link
          href="/digital/contact"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          Start the review
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
