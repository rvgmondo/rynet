import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AgencyClose } from "@/components/agency/agency-close";
import { REVIEW_CTA, TERMS } from "@/components/agency/agency-content";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { Notice } from "@/components/ui/notice";
import { PriceTag } from "@/components/ui/price-tag";
import { SectionHeader } from "@/components/ui/section-header";
import { PRICE_BANDS, PRICING_FAQS, PRICING_IS_UNPUBLISHED } from "@/content/agency/pricing";
import { faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "How Rynet Digital charges for dealership websites, stock feeds, paid media and ongoing work, what moves the price up or down, and why we never take a percentage of ad spend.",
  alternates: { canonical: "/digital/pricing" },
};

/*
 * Which qualification-form interest each band preselects on the contact page. Ongoing work spans
 * several interests, so it preselects none rather than guessing.
 */
const BAND_INTEREST: Record<string, string | undefined> = {
  website: "website",
  feeds: "feeds",
  media: "paid_media",
};

const DRIVERS = [
  {
    heading: "Pushes the price up",
    icon: TrendingUp,
    items: [
      "A DMS whose export nobody has integrated before. The first mapping is the expensive one.",
      "Several branches with separate stock, hours, teams and Google profiles.",
      "Moving from a platform that will not export cleanly, which is most of them.",
      "A large set of existing pages that has to keep its search positions through a move.",
      "A fixed deadline somebody else set.",
    ],
  },
  {
    heading: "Brings the price down",
    icon: TrendingDown,
    items: [
      "One branch, one stock feed, one Google profile.",
      "A DMS we have already mapped for another dealership.",
      "Someone on your side who can make decisions without a committee.",
      "Taking your own photographs once we have set the process up, rather than booking a shoot each time.",
      "Starting with two services instead of seven. Almost everyone should.",
    ],
  },
] as const;

/**
 * Pricing.
 *
 * No figures are published, because none have been agreed and any number here would be invented
 * (src/content/agency/pricing.ts, every `from` is null). So each package shows "On application"
 * and a route to a written quote, and the page leads with what IS fixed: the commercial terms.
 * Set a real `from` on a band and its card renders "From R ..." instead; the notice about
 * unpublished rates disappears once every band has one.
 *
 * Every question in the FAQ is visible on the page, which is the condition for its JSON-LD.
 */
export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(PRICING_FAQS)) }}
      />

      <AgencyPageHead
        trail={[{ href: "/digital/pricing", label: "Pricing" }]}
        eyebrow="Pricing"
        title="What it costs, and the terms behind it"
        lead="What each kind of engagement covers, what moves the price up or down, and the terms that apply whatever the figure turns out to be."
        aside={
          <div className="rounded-lg border border-line bg-page p-5 sm:p-6">
            <p className="text-sm font-semibold text-heading">How a figure is reached</p>
            <ol className="mt-4 grid gap-3">
              {[
                "A free review of your site, stock feed and advertising",
                "A call to agree what matters this year",
                "A scope and a figure in writing, before you commit",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-[0.9375rem] text-body">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-on-secondary tabular"
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        }
      />

      <section aria-labelledby="terms-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="terms-heading"
            eyebrow="Fixed, whatever the figure"
            title="Three terms that do not change"
          />
          <ul className="mt-8 grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {TERMS.map((term) => (
              <li
                key={term.title}
                className="flex gap-4 py-5 md:flex-col md:gap-0 md:px-6 md:py-6 md:first:ps-0"
              >
                <term.icon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-heading" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-heading md:mt-4">{term.title}</h3>
                  <p className="mt-1.5 text-body">{term.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="bands-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="bands-heading"
            eyebrow="Packages"
            title="Four ways to work with us"
            lead="Start with one or two. Nobody needs all four on day one, and the review will say which come first."
          />

          {PRICING_IS_UNPUBLISHED ? (
            <Notice title="A written figure before you commit" className="mt-8 max-w-3xl">
              Rynet Digital is new, so we have not published rates. We would rather quote your
              dealership in writing, after the free review, than print a range we might have to
              revise.
            </Notice>
          ) : null}

          <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRICE_BANDS.map((band) => {
              const interest = BAND_INTEREST[band.slug];
              return (
                <li key={band.slug} className="flex">
                  <article
                    aria-labelledby={`band-${band.slug}`}
                    className="rn-card bg-page p-6 dark:bg-subtle"
                  >
                    <Badge className="self-start">{band.basis}</Badge>
                    <h3 id={`band-${band.slug}`} className="rn-h3 mt-4">
                      {band.name}
                    </h3>

                    <p className="mt-4 text-sm font-semibold text-heading">Suits</p>
                    <p className="mt-1 text-sm text-body">{band.who}</p>
                    <p className="mt-4 text-sm font-semibold text-heading">Includes</p>
                    <p className="mt-1 text-sm text-body">{band.what}</p>

                    <div className="mt-auto pt-6">
                      <div className="border-t border-line pt-5">
                        {band.from === null ? (
                          <>
                            <p className="text-xl font-semibold text-heading">On application</p>
                            <p className="mt-1 text-sm text-muted">
                              Quoted in writing after your free review.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted">From</p>
                            <PriceTag value={band.from} size="lg" />
                            <p className="mt-1 text-sm text-muted">Excluding VAT.</p>
                          </>
                        )}
                      </div>
                      <Link
                        href={
                          interest ? `${REVIEW_CTA.href}?interest=${interest}` : REVIEW_CTA.href
                        }
                        className={buttonClasses({
                          variant: "outline",
                          block: true,
                          className: "mt-5",
                        })}
                      >
                        Ask for a quote
                        <span className="sr-only"> for {band.name.toLowerCase()}</span>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="drivers-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="drivers-heading"
            eyebrow="What moves the price"
            title="Why two dealerships rarely pay the same"
            lead="Worth knowing before the call rather than after the quote."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {DRIVERS.map((column) => (
              <div key={column.heading} className="rn-card p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-subtle text-heading">
                    <column.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="rn-h3">{column.heading}</h3>
                </div>
                <ul className="mt-6 divide-y divide-line border-t border-line">
                  {column.items.map((item) => (
                    <li key={item} className="py-3.5 text-body">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="pb-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader id="faq-heading" eyebrow="Questions" title="What dealers ask us" />
          <div className="rn-panel mt-8 max-w-4xl divide-y divide-line">
            {PRICING_FAQS.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 text-left font-semibold text-heading hover:bg-subtle sm:px-6 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="px-5 pb-5 text-body sm:px-6">{faq.answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            Something else?{" "}
            <Link href={REVIEW_CTA.href} className="rn-link-arrow">
              Ask it in the review form
              <ArrowRight aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>

      <AgencyClose id="pricing-close" title="Get a written figure for your dealership">
        Tell us what you have and what is not working. You get a figure in writing before you commit
        to anything, and if the honest answer is that you do not need us yet, that is what you get
        instead.
      </AgencyClose>
    </>
  );
}
