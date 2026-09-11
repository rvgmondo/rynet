import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { agencyJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About",
  description:
    "Rynet Digital works with South African car dealerships and nobody else. Who we are, why we only take dealerships, and how the agency and the marketplace are kept apart.",
  alternates: { canonical: "/digital/about" },
};

/**
 * About.
 *
 * No team photographs and no headcount, because there is no team to photograph yet and
 * inventing one is out of the question. The page says so instead, which is both true and
 * the more useful thing for a dealer principal deciding whether to call.
 *
 * The section on the conflict of interest is not optional. Rynet runs a marketplace that
 * dealerships list on, and an agency that sells services to those same dealerships. That is
 * a real conflict, every dealer will spot it, and a page that does not address it looks like
 * a page that hopes nobody asks.
 */
export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agencyJsonLd()) }}
      />

      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/digital/about", label: "About" }]} />

          <h1 className="rn-head mt-8 max-w-[14ch]">About Rynet Digital</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            We work with car dealerships and nobody else, from Pretoria, and we built the
            marketplace this site sits on.
          </p>
        </div>
      </section>

      {/*
        The argument on the right, the claim on the left.
        ------------------------------------------------
        Both of these were stacked columns of body copy in the left half of the screen with
        the right half empty, at the default type scale. It is the same spread the marketplace
        uses for its verification copy, which is deliberate: this is the same kind of claim,
        made by the same company, and a visitor crossing between the two front doors should
        find the argument presented the same way.
      */}
      <section aria-labelledby="only-heading" className="container-page py-[var(--section-base)]">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="only-heading" className="rn-head max-w-[10ch]">
            Why only dealerships
          </h2>
          <div className="space-y-5">
            <p className="rn-prose rn-prose--drop text-ink-secondary">
              A general agency learns your business on your budget. It spends the first two months
              working out what a derivative is, why a unit at ninety days is a problem, and why the
              car in the photograph has to be the car you are selling.
            </p>
            <p className="rn-prose text-ink-secondary">
              We only take dealerships, so that part is already done. We know what a DMS export
              looks like, why the stock feed breaks, and what a floor plan costs you every month a
              unit does not move. That is the whole argument for the restriction, and it is why we
              will turn down work outside it.
            </p>
          </div>
        </div>

        <hr className="rn-rule mt-[var(--section-base)]" />

        <div className="mt-[var(--section-base)] grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="proof-heading" className="rn-head max-w-[12ch]">
            What we have actually built
          </h2>
          <div className="space-y-5">
            <p className="rn-prose rn-prose--drop text-ink-secondary">
              <Link href="/" className="font-semibold text-accent hover:underline">
                Rynet Showroom
              </Link>
              , the marketplace on this domain. Search across hundreds of listings, dealership
              pages, vehicle pages with finance estimates, enquiry handling with POPIA consent
              recorded properly, and structured data throughout. Built to WCAG 2.2 AA with automated
              checks that fail the build rather than an audit at the end.
            </p>
            <p className="rn-prose text-ink-secondary">
              You can open it and judge it, which is the point. It is the reason there is no case
              study section on this site: we have not done client work yet, so a case study would be
              invented, and we would rather show you something real than describe something that is
              not.
            </p>
          </div>
        </div>
      </section>

      {/*
        The conflict of interest, on the ground that says we are not hiding it.
        ----------------------------------------------------------------------
        Every dealer principal will work this out in the first thirty seconds, so the only
        choice is whether they hear it from us or notice it themselves and wonder what else
        was left out. It was in a bordered box two thirds of the way down a stack of body
        copy, which is where a business puts something it hopes will be skimmed past.
      */}
      <section aria-labelledby="conflict-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="conflict-heading" className="rn-head max-w-[14ch]">
            The obvious conflict, addressed
          </h2>
          <hr className="mt-8 h-px border-0 bg-silver" />

          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <p className="rn-prose rn-prose--drop text-lg">
              Rynet runs a marketplace that dealerships list on, and an agency that sells services
              to dealerships. If the agency&apos;s clients quietly ranked higher on the marketplace,
              the marketplace would be worthless and the agency would be selling access rather than
              work.
            </p>
            <div className="space-y-5">
              <p className="rn-prose opacity-90">
                So: <strong className="font-semibold">they do not.</strong> Verification runs on the
                same evidence for everyone. Search results are ordered by what the buyer asked for.
                There is no paid placement of any kind on Rynet Showroom, for agency clients or
                anyone else, and if that ever changes it will be labelled on the page where it
                happens.
              </p>
              <p className="rn-label border-t border-silver/40 pt-5 opacity-70">
                You do not have to take that on trust. Ask us at the contract stage to put it in
                writing, and we will.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="team-heading" className="container-page py-[var(--section-base)]">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="team-heading" className="rn-head max-w-[12ch]">
            Who you will deal with
          </h2>
          <div className="space-y-5">
            <p className="rn-prose rn-prose--drop text-ink-secondary">
              Rynet Digital is small and new. There is no page of headshots here because there is
              not yet a team to photograph, and a stock photograph of people in a meeting room is
              not an answer to this question.
            </p>
            <p className="rn-prose text-ink-secondary">
              In practice you will deal with the person who does the work. When that stops being
              true we will put the actual names and faces on this page.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-cta" className="container-page pb-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <h2 id="about-cta" className="rn-head max-w-[14ch]">
            Have a look at the work first
          </h2>
          <div>
            <p className="rn-prose text-ink-secondary">
              Open the marketplace on your phone, then tell us what you would want done differently
              on your own site.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/digital/contact"
                className="rn-label inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
              >
                Get in touch
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/"
                className="rn-label inline-flex min-h-12 items-center border border-line-interactive px-6 hover:bg-ink hover:text-ink-inverse"
              >
                Open Rynet Showroom
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
