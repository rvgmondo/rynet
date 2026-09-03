import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
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
 */
export default function PricingPage() {
  return (
    <div className="container-page py-[var(--section-tight)]">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PRICING_FAQS)) }}
      />

      <Breadcrumbs trail={[{ href: "/digital/pricing", label: "Pricing" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">How we price</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          What the money buys, what makes it go up and down, and the three commitments that matter
          more than the number.
        </p>
      </div>

      {PRICING_IS_UNPUBLISHED ? (
        <div className="measure mt-10 rounded-lg border-2 border-line-interactive p-6">
          <h2 className="text-lg">We are not publishing rates yet</h2>
          <p className="mt-3 text-sm text-ink-secondary">
            Rynet Digital is new and has not done enough dealership work to quote a range we would
            stand behind. We would rather say that than print a number we invented, because you
            would plan around it and we would have to revise it.
          </p>
          <p className="mt-3 text-sm text-ink-secondary">
            Ask on a call and you will get a real figure for your situation, in writing, before you
            commit to anything. The shapes of engagement below are accurate today; only the numbers
            are missing.
          </p>
        </div>
      ) : null}

      <section aria-labelledby="bands-heading" className="mt-14">
        <h2 id="bands-heading" className="text-2xl">
          The shapes of engagement
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {PRICE_BANDS.map((band) => (
            <li key={band.slug} className="flex flex-col rounded-lg border border-line p-6">
              <p className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-ink-muted">
                {band.basis}
              </p>
              <h3 className="mt-2 text-lg">{band.name}</h3>

              <p className="mt-3 text-sm text-ink-secondary">{band.who}</p>
              <p className="mt-3 text-sm text-ink-secondary">{band.what}</p>

              <p className="mt-auto pt-5 text-sm font-semibold tabular">
                {band.from === null ? (
                  <span className="text-ink-muted">Quoted per dealership</span>
                ) : (
                  <>
                    From {formatRand(band.from)}{" "}
                    <span className="font-normal text-ink-muted">excluding VAT</span>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="drivers-heading" className="mt-14">
        <h2 id="drivers-heading" className="text-2xl">
          What moves the number
        </h2>
        <p className="measure mt-4 text-ink-secondary">
          Two dealerships asking for the same thing rarely pay the same, and it is worth knowing why
          before the call rather than after the quote.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-6">
            <h3 className="flex items-center gap-2 text-lg">
              <TrendingUp aria-hidden="true" className="size-5 text-accent" />
              Pushes it up
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              {[
                "A DMS whose export nobody has integrated before. The first mapping is the expensive one.",
                "Several branches with separate stock, hours, teams and Google profiles.",
                "Migrating from a platform that will not export cleanly, which is most of them.",
                "A large back catalogue of pages that has to keep its search positions through a move.",
                "Anything that has to be finished by a fixed date somebody else set.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <TrendingUp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line p-6">
            <h3 className="flex items-center gap-2 text-lg">
              <TrendingDown aria-hidden="true" className="size-5 text-ink-muted" />
              Brings it down
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              {[
                "One branch, one stock feed, one Google profile.",
                "A DMS we have already mapped for another dealership.",
                "Somebody on your side who can make decisions without a committee.",
                "Taking your own photographs after we set the process up, rather than booking a shoot each time.",
                "Starting with two services instead of seven. Almost everyone should.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <TrendingDown
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ink-muted"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mt-14">
        <h2 id="faq-heading" className="text-2xl">
          The questions that actually get asked
        </h2>
        <dl className="measure mt-6 divide-y divide-line border-y border-line">
          {PRICING_FAQS.map((faq) => (
            <div key={faq.question} className="py-5">
              <dt className="font-semibold">{faq.question}</dt>
              <dd className="mt-2 text-sm text-ink-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="pricing-cta"
        className="mt-[var(--section-base)] rounded-lg bg-surface-sunken p-8"
      >
        <h2 id="pricing-cta" className="text-2xl">
          Get a real number
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Tell us what you have and what is not working. You will get a figure in writing, and if
          the honest answer is that you do not need us yet, that is what you will get instead.
        </p>
        <Link
          href="/digital/contact"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          Get in touch
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
