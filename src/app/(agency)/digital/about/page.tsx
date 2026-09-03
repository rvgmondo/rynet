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
    <div className="container-page py-[var(--section-tight)]">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agencyJsonLd()) }}
      />

      <Breadcrumbs trail={[{ href: "/digital/about", label: "About" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">About Rynet Digital</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          We work with car dealerships and nobody else, from Pretoria, and we built the marketplace
          this site sits on.
        </p>
      </div>

      <section aria-labelledby="only-heading" className="mt-14">
        <h2 id="only-heading" className="text-2xl">
          Why only dealerships
        </h2>
        <div className="measure mt-4 space-y-4 text-ink-secondary">
          <p>
            A general agency learns your business on your budget. It spends the first two months
            working out what a derivative is, why a unit at ninety days is a problem, and why the
            car in the photograph has to be the car you are selling.
          </p>
          <p>
            We only take dealerships, so that part is already done. We know what a DMS export looks
            like, why the stock feed breaks, and what a floor plan costs you every month a unit does
            not move. That is the whole argument for the restriction, and it is why we will turn
            down work outside it.
          </p>
        </div>
      </section>

      <section aria-labelledby="proof-heading" className="mt-14">
        <h2 id="proof-heading" className="text-2xl">
          What we have actually built
        </h2>
        <div className="measure mt-4 space-y-4 text-ink-secondary">
          <p>
            <Link href="/" className="font-semibold text-accent hover:underline">
              Rynet Showroom
            </Link>
            , the marketplace on this domain. Search across hundreds of listings, dealership pages,
            vehicle pages with finance estimates, enquiry handling with POPIA consent recorded
            properly, and structured data throughout. Built to WCAG 2.2 AA with automated checks
            that fail the build rather than an audit at the end.
          </p>
          <p>
            You can open it and judge it, which is the point. It is the reason there is no case
            study section on this site: we have not done client work yet, so a case study would be
            invented, and we would rather show you something real than describe something that is
            not.
          </p>
        </div>
      </section>

      {/*
        The conflict of interest. Every dealer principal will work this out in the first
        thirty seconds, so the only choice is whether they hear it from us or notice it
        themselves and wonder what else was left out.
      */}
      <section aria-labelledby="conflict-heading" className="mt-14">
        <h2 id="conflict-heading" className="text-2xl">
          The obvious conflict, addressed
        </h2>
        <div className="measure mt-4 rounded-lg border-2 border-line-interactive p-6">
          <p className="text-ink-secondary">
            Rynet runs a marketplace that dealerships list on, and an agency that sells services to
            dealerships. If the agency&apos;s clients quietly ranked higher on the marketplace, the
            marketplace would be worthless and the agency would be selling access rather than work.
          </p>
          <p className="mt-4 text-ink-secondary">
            So: <strong className="font-semibold text-ink">they do not.</strong> Verification runs
            on the same evidence for everyone. Search results are ordered by what the buyer asked
            for. There is no paid placement of any kind on Rynet Showroom, for agency clients or
            anyone else, and if that ever changes it will be labelled on the page where it happens.
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            You do not have to take that on trust. Ask us at the contract stage to put it in
            writing, and we will.
          </p>
        </div>
      </section>

      <section aria-labelledby="team-heading" className="mt-14">
        <h2 id="team-heading" className="text-2xl">
          Who you will deal with
        </h2>
        <div className="measure mt-4 space-y-4 text-ink-secondary">
          <p>
            Rynet Digital is small and new. There is no page of headshots here because there is not
            yet a team to photograph, and a stock photograph of people in a meeting room is not an
            answer to this question.
          </p>
          <p>
            In practice you will deal with the person who does the work. When that stops being true
            we will put the actual names and faces on this page.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="about-cta"
        className="mt-[var(--section-base)] rounded-lg bg-surface-sunken p-8"
      >
        <h2 id="about-cta" className="text-2xl">
          Have a look at the work first
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Open the marketplace on your phone, then tell us what you would want done differently on
          your own site.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/digital/contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
          >
            Get in touch
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border-2 border-line-interactive px-6 font-semibold hover:bg-surface-raised"
          >
            Open Rynet Showroom
          </Link>
        </div>
      </section>
    </div>
  );
}
