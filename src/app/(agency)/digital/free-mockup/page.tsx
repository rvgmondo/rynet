import { Check, ChevronDown } from "lucide-react";
import type { Metadata } from "next";

import { MockupRequestForm } from "@/components/agency/mockup-request-form";
import { ShowroomFrame } from "@/components/agency/showroom-frame";
import { getShowroomSample } from "@/components/agency/showroom-sample";
import { buttonClasses } from "@/components/ui/button-classes";
import { SectionHeader } from "@/components/ui/section-header";
import {
  MOCKUP_FAQS,
  MOCKUP_GETS,
  MOCKUP_OFFER,
  MOCKUP_STEPS,
} from "@/content/agency/mockup-offer";
import { faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "A free website mockup for your dealership",
  description:
    "Tell us your dealership and we design a new homepage for it, from your own stock and photographs, and send you a private link. Free, with no obligation.",
  alternates: { canonical: "/digital/free-mockup" },
};

/*
 * On demand, because the frame below shows live marketplace listings from the database, which
 * does not exist during `next build`. The listings themselves are cached (showroom-sample.ts).
 */
export const dynamic = "force-dynamic";

/**
 * The free mockup: Rynet Digital's no-brainer.
 *
 * A dealer principal judges a website they can see far better than a proposal they have to
 * imagine, and the risk to them is a minute of their time. So the page makes one offer, puts the
 * form beside it in the first screen, and spends the rest answering the two questions every
 * dealer has: "what exactly do I get" and "what is the catch".
 *
 * No client names, logos or results: Rynet Digital has none it may show. The proof is the
 * marketplace, built by the same team and open on this domain.
 */
export default async function FreeMockupPage() {
  const cards = await getShowroomSample(2);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd([...MOCKUP_FAQS])) }}
      />

      <section className="relative overflow-hidden border-b border-line-on-navy bg-navy">
        <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16 lg:py-20">
          <div className="on-navy">
            <p className="rn-eyebrow text-on-navy-muted">Free, for South African car dealerships</p>
            <h1 className="rn-h1 mt-4 max-w-[14ch]">{MOCKUP_OFFER.headline}</h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed sm:text-lg">
              {MOCKUP_OFFER.promise}
            </p>

            <ol className="mt-10 grid gap-6 border-t border-line-on-navy pt-8">
              {MOCKUP_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-line-on-navy text-sm font-semibold text-on-navy tabular"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h2 className="text-base font-semibold text-on-navy">{step.title}</h2>
                    <p className="mt-1 text-sm text-on-navy-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-w-0">
            <div id="request" className="rn-panel scroll-mt-24 p-5 sm:p-8">
              <MockupRequestForm />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="gets-heading" className="py-[var(--section-base)]">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">What you get</p>
            <h2 id="gets-heading" className="rn-h2 mt-2">
              A homepage made for your dealership, not filled in
            </h2>
            <p className="mt-4 text-body">
              Not a template with your logo dropped in. A design for your dealership, from what you
              already sell.
            </p>
          </div>
          <ul className="grid gap-4 self-center">
            {MOCKUP_GETS.map((item) => (
              <li key={item} className="flex gap-3 text-[1.0625rem] text-heading">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success-subtle text-success"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="proof-heading"
        className="border-y border-line bg-card py-[var(--section-base)]"
      >
        <div className="container-page">
          <SectionHeader
            id="proof-heading"
            eyebrow="Who makes it"
            title="The team that built the Rynet marketplace"
            lead="Open it on your phone: quick on a slow connection, and live stock from checked dealerships. Your homepage gets the same care."
          />
          <div className="mt-10">
            <ShowroomFrame cards={cards} />
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="py-[var(--section-base)]">
        <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">Questions</p>
            <h2 id="faq-heading" className="rn-h2 mt-2">
              What is the catch?
            </h2>
            <p className="mt-4 text-body">There is none. Here is what dealers ask us anyway.</p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {MOCKUP_FAQS.map((faq) => (
              <details key={faq.question} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-heading">
                  {faq.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="pb-5 text-body">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="close-heading" className="container-page pb-[var(--section-base)]">
        <div className="on-navy relative isolate overflow-hidden rounded-lg bg-navy px-6 py-10 sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-16 lg:px-14">
          <div className="max-w-2xl">
            <h2 id="close-heading" className="rn-h2">
              One minute now, a new homepage in {MOCKUP_OFFER.turnaround}
            </h2>
            <p className="mt-3 text-base text-on-navy-muted sm:text-lg">
              Free, private, and you owe us nothing.
            </p>
          </div>
          <a
            href="#request"
            className={`${buttonClasses({ variant: "primary", size: "lg", block: "mobile" })} mt-8 lg:mt-0`}
          >
            Get my free mockup
          </a>
        </div>
      </section>
    </>
  );
}
