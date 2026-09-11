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
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/digital/process", label: "How we work" }]} />

          <h1 className="rn-head mt-8 max-w-[12ch]">How we work</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            Five stages. The first one is free and the second one ends with a number in writing.
            What you have to do at each stage is listed, because that is usually the part nobody
            mentions until it is late.
          </p>
        </div>
      </section>

      {/*
        Five stages as a ruled sheet, not five bordered cards.
        -----------------------------------------------------
        A number in a box in a stack of boxes is a card grid pretending to be a sequence. The
        rule between rows is what makes it read in order, the number carries the display face
        so the eye can find its place from across the room, and "what you do" sits in its own
        column rather than in a quoted aside, because on this page it is the half a dealer
        principal has actually come to read.
      */}
      <section className="container-page py-[var(--section-base)]">
        <ol className="border-t border-line">
          {STAGES.map((stage) => (
            <li
              key={stage.number}
              className="grid gap-4 border-b border-line py-8 lg:grid-cols-[4rem_1fr_1fr] lg:gap-10"
            >
              <p
                aria-hidden="true"
                className="font-display text-2xl font-extrabold tabular text-ink-muted [font-variation-settings:'wdth'_112]"
              >
                {stage.number}
              </p>

              <div>
                <h2 className="font-display text-xl font-bold leading-snug">{stage.name}</h2>
                <p className="rn-label mt-2 text-ink-muted">{stage.duration}</p>
                <p className="rn-prose mt-4 text-ink-secondary">{stage.what}</p>
              </div>

              <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:ps-10 lg:pt-0">
                <p className="rn-label text-ink-muted">What you do</p>
                <p className="rn-prose mt-3 text-ink-secondary">{stage.you}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/*
        The point of the page, on the ground that says so.
        -------------------------------------------------
        Every agency process page describes the happy path, which is the least useful thing
        to publish: a dealer principal has been through this before and knows it goes wrong.
        Naming the two ways it actually does, and saying out loud which one is our fault, is
        worth more than another diagram of arrows. So it is not a pair of boxes at the bottom
        of a stack, it is the band the page is built towards.
      */}
      <section aria-labelledby="wrong-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="wrong-heading" className="rn-head max-w-[14ch]">
            The two ways this goes wrong
          </h2>
          <p className="measure mt-5 text-lg opacity-80">
            Worth saying before you commit rather than after, since you have almost certainly had at
            least one of these happen to you before.
          </p>
          <hr className="mt-8 h-px border-0 bg-silver" />

          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-silver">
            {[
              {
                title: "Approvals stall",
                cause:
                  "A question sits for two weeks because the person who can answer it is on the floor selling cars, which is where they should be. The build waits, the momentum goes, and the eventual launch lands in a month nobody planned for.",
                fix: "One named contact, questions batched rather than trickled, and a default. If we do not hear back in three working days we take the sensible option and tell you what we chose, so the work keeps moving and you can still change it.",
                whose: "Usually your side, and it is understandable",
              },
              {
                title: "The stock feed is worse than it looked",
                cause:
                  "The export is missing a field that matters, or encodes derivative and variant in one string, or the photographs come through in an order nobody controls. This is the normal case in South Africa, not the unlucky one, and it is where estimates break.",
                fix: "We ask for a real export before quoting, not a description of one. If we quote without seeing it and it turns out worse, that is our risk and our cost, not a variation order.",
                whose: "Our side to manage",
              },
            ].map((item, index) => (
              <div key={item.title} className={index === 0 ? "lg:pe-12" : "lg:ps-12"}>
                <h3 className="font-display text-2xl font-bold leading-tight">{item.title}</h3>
                <p className="rn-prose mt-4 opacity-90">{item.cause}</p>
                <p className="rn-label mt-8 opacity-70">What we do about it</p>
                <p className="rn-prose mt-3 opacity-90">{item.fix}</p>
                <p className="rn-label mt-8 border-t border-silver/40 pt-4 opacity-70">
                  {item.whose}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="process-cta" className="container-page py-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <h2 id="process-cta" className="rn-head max-w-[10ch]">
            Stage one is free
          </h2>
          <div>
            <p className="rn-prose text-ink-secondary">
              Send us your site and you get the written review whether or not anything comes of it.
            </p>
            <Link
              href="/digital/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
            >
              Start the review
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
