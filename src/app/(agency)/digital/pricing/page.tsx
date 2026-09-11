import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PRICE_BANDS, PRICING_FAQS, PRICING_IS_UNPUBLISHED } from "@/content/agency/pricing";
import { formatRand } from "@/lib/format";
import { faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "How we price",
  description:
    "How Rynet Digital charges for dealership websites, stock feeds, paid media and ongoing work, what drives the number up and down, and why we do not take a percentage of ad spend.",
  alternates: { canonical: "/digital/pricing" },
};

/**
 * Pricing.
 *
 * No figures are published, because none have been agreed and every number here would be
 * invented. That is a real weakness on an agency page and the alternative is worse: a made
 * up range gets planned around, then revised, and the revision is the thing the dealer
 * remembers.
 *
 * So this page sells the pricing *model* instead, which is the part that actually
 * differentiates: fixed fee rather than a percentage of spend, you own what is built, no
 * lock-in past the first three months. Those are commitments rather than claims, and they
 * are checkable at the contract stage.
 *
 * The bands render their real figures the moment `src/content/agency/pricing.ts` has them.
 *
 * REDRAWN, on the same argument as the agency home page. This was nine bordered boxes in the
 * left half of the screen at the default type scale. On a page whose entire proposition is
 * "we will not print a number we cannot stand behind", looking like every other agency's
 * pricing page undoes the argument before it is read.
 */
export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PRICING_FAQS)) }}
      />

      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/digital/pricing", label: "Pricing" }]} />

          <h1 className="rn-head mt-8 max-w-[12ch]">How we price</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            What the money buys, what makes it go up and down, and the three commitments that matter
            more than the number.
          </p>
        </div>
      </section>

      {/*
        The missing number, said out loud at the size of the thing it replaces.
        ----------------------------------------------------------------------
        A dealer principal arrives here for a figure and there is not one. That fact is the
        first thing on the page rather than a grey box beside it, because the way this reads
        as confidence rather than evasion is to lead with it and give the reason in the same
        breath. It is set as an editorial spread, which is also the only honest use of the
        space a pricing table would have taken.
      */}
      {PRICING_IS_UNPUBLISHED ? (
        <section
          aria-labelledby="unpublished-heading"
          className="bg-surface-inverse text-ink-inverse"
        >
          <div className="container-page py-[var(--section-base)]">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
              <h2 id="unpublished-heading" className="rn-head max-w-[12ch]">
                We are not publishing rates yet
              </h2>
              <div className="space-y-5">
                <p className="rn-prose rn-prose--drop text-lg">
                  Rynet Digital is new and has not done enough dealership work to quote a range we
                  would stand behind. We would rather say that than print a number we invented,
                  because you would plan around it and we would have to revise it.
                </p>
                <p className="rn-prose opacity-90">
                  Ask on a call and you will get a real figure for your situation, in writing,
                  before you commit to anything. The shapes of engagement below are accurate today.
                  Only the numbers are missing.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/*
        Four ways of working, as a ruled sheet rather than four bordered boxes. The rule
        between them is the same information as the border, with nothing drawn around it.
      */}
      <section aria-labelledby="bands-heading" className="container-page py-[var(--section-base)]">
        <h2 id="bands-heading" className="rn-head max-w-[16ch]">
          The shapes of engagement
        </h2>
        <hr className="rn-rule mt-6" />

        <ul className="grid md:grid-cols-2 md:gap-x-12">
          {PRICE_BANDS.map((band) => (
            <li key={band.slug} className="flex flex-col border-b border-line py-7">
              <p className="rn-label text-ink-muted">{band.basis}</p>
              <h3 className="mt-3 font-display text-xl font-bold leading-snug">{band.name}</h3>

              <p className="rn-prose mt-4 text-ink-secondary">{band.who}</p>
              <p className="rn-prose mt-3 text-ink-secondary">{band.what}</p>

              <p className="rn-label mt-auto pt-6 tabular">
                {band.from === null ? (
                  <span className="text-ink-muted">Quoted per dealership</span>
                ) : (
                  <>
                    From {formatRand(band.from)}{" "}
                    <span className="text-ink-muted">excluding VAT</span>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Up on the left, down on the right, split by a rule. The arrows that used to sit
        beside every line are gone: the column heading already says which direction the list
        goes in, and repeating it eleven times in red is decoration pretending to be a key.
      */}
      <section
        aria-labelledby="drivers-heading"
        className="container-page pb-[var(--section-base)]"
      >
        <h2 id="drivers-heading" className="rn-head max-w-[16ch]">
          What moves the number
        </h2>
        <p className="measure mt-5 text-lg text-ink-secondary">
          Two dealerships asking for the same thing rarely pay the same, and it is worth knowing why
          before the call rather than after the quote.
        </p>
        <hr className="rn-rule mt-8" />

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line-strong">
          {[
            {
              heading: "Pushes it up",
              items: [
                "A DMS whose export nobody has integrated before. The first mapping is the expensive one.",
                "Several branches with separate stock, hours, teams and Google profiles.",
                "Migrating from a platform that will not export cleanly, which is most of them.",
                "A large back catalogue of pages that has to keep its search positions through a move.",
                "Anything that has to be finished by a fixed date somebody else set.",
              ],
            },
            {
              heading: "Brings it down",
              items: [
                "One branch, one stock feed, one Google profile.",
                "A DMS we have already mapped for another dealership.",
                "Somebody on your side who can make decisions without a committee.",
                "Taking your own photographs after we set the process up, rather than booking a shoot each time.",
                "Starting with two services instead of seven. Almost everyone should.",
              ],
            },
          ].map((column, index) => (
            <div key={column.heading} className={index === 0 ? "lg:pe-12" : "lg:ps-12"}>
              <h3 className="rn-label text-ink-muted">{column.heading}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item} className="border-t border-line py-4 text-sm text-ink-secondary">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="container-page pb-[var(--section-base)]">
        <h2 id="faq-heading" className="rn-head max-w-[18ch]">
          The questions that actually get asked
        </h2>
        <hr className="rn-rule mt-6" />

        <dl className="grid lg:grid-cols-2 lg:gap-x-12">
          {PRICING_FAQS.map((faq) => (
            <div key={faq.question} className="border-b border-line py-6">
              <dt className="font-display text-lg font-bold leading-snug">{faq.question}</dt>
              <dd className="rn-prose mt-3 text-ink-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pricing-cta" className="container-page pb-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <h2 id="pricing-cta" className="rn-head max-w-[10ch]">
            Get a real number
          </h2>
          <div>
            <p className="rn-prose text-ink-secondary">
              Tell us what you have and what is not working. You will get a figure in writing, and
              if the honest answer is that you do not need us yet, that is what you will get
              instead.
            </p>
            <Link
              href="/digital/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
            >
              Get in touch
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
