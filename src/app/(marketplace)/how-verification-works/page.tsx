import config from "@payload-config";
import { ArrowRight, BadgeCheck, CircleX, Flag, Mail, ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Notice } from "@/components/ui";
import { buttonClasses } from "@/components/ui/button-classes";
import { VERIFICATION_CHECKS } from "@/content/verification-checks";

/**
 * Rendered on demand, because the disclosure about demonstration dealerships is read from the
 * database. A prerender would freeze it at build time and fail the build where there is none.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How we verify dealerships",
  description:
    "Only registered dealerships Rynet has checked can list. What we check, who decides, what a buyer can rely on, and what verification does not cover.",
  alternates: { canonical: "/how-verification-works" },
};

/**
 * The trust proposition, made into a page.
 *
 * "Only verified dealerships" is the entire product argument, and a badge that links nowhere is
 * decoration. This is what the badge links to.
 *
 * EVERY SENTENCE HERE IS ONE THE CODE KEEPS. A dealership starts as pending and only platform
 * staff can change that (Dealers.verificationStatus has its own access rule); stock cannot go
 * live unless the dealership is verified (the Vehicles beforeChange hook); memberships can only
 * be added by staff (Dealers.accreditations, and e2e/isolation.spec.ts attacks it); a pending or
 * suspended dealership is missing from the directory and its page answers 404. Things the code
 * does NOT do are not claimed: there is no recorded decision trail of who approved a dealership
 * and when, and suspending a dealership does not by itself take its existing stock down, so the
 * page says neither.
 *
 * It is deliberately specific about what is NOT checked. A trust page that only lists
 * reassurances is marketing; one that says where the line is can be relied on.
 */

const CHECKS = VERIFICATION_CHECKS;

/** The fields on Dealers that verification rests on, described as the collection defines them. */
const RECORD = [
  { term: "Registered name", detail: "As CIPC holds it. Every record must have one." },
  { term: "CIPC registration number", detail: "The company registration number." },
  { term: "VAT number", detail: "For a dealership registered for VAT." },
  { term: "Motor trade number", detail: "Where the dealership holds one." },
  { term: "Industry memberships", detail: "Added by Rynet staff only." },
  {
    term: "Status",
    detail: "Pending, verified, suspended or archived. Set by Rynet staff only.",
  },
];

const RELY_ON = [
  {
    title: "No private sellers",
    body: "There is no private seller account and no way to create one. A buyer account can never list a car.",
  },
  {
    title: "Unverified dealerships cannot publish",
    body: "A dealership's stock goes live only while that dealership is verified.",
  },
  {
    title: "Memberships are genuine",
    body: "An industry membership on a profile was added by Rynet, not claimed by the dealership.",
  },
  {
    title: "Suspension is real",
    body: "A suspended dealership leaves the dealership directory, its page stops loading, and it cannot put stock live.",
  },
];

const NOT_COVERED = [
  "We have not inspected the car. Verification is about the business, not the vehicle: we have not driven it, put it on a lift, or checked the odometer against the service record.",
  "We do not check that the mileage, service history or condition on a listing is accurate. The dealership supplies that and is responsible for it.",
  "We do not run a finance, accident or stolen-vehicle check on individual cars.",
  "A verified dealership is not a guarantee of a good deal or good service. It means you know who you are dealing with.",
];

type DealerCounts = { demonstration: number; real: number };

/** How many listed dealerships are demonstration data. Five minutes stale at most. */
const readDealerCounts = unstable_cache(
  async (): Promise<DealerCounts> => {
    const payload = await getPayload({ config });
    const verified = { verificationStatus: { equals: "verified" } } as const;
    const [demonstration, real] = await Promise.all([
      payload.count({
        collection: "dealers",
        where: { and: [verified, { isDemonstration: { equals: true } }] },
      }),
      payload.count({
        collection: "dealers",
        where: { and: [verified, { isDemonstration: { not_equals: true } }] },
      }),
    ]);
    return { demonstration: demonstration.totalDocs, real: real.totalDocs };
  },
  ["verification-dealer-counts"],
  { revalidate: 300 },
);

async function dealerCounts(): Promise<DealerCounts | null> {
  try {
    return await readDealerCounts();
  } catch {
    // No database answer means no claim either way; the notice falls back to general wording.
    return null;
  }
}

export default async function HowVerificationWorksPage() {
  const counts = await dealerCounts();
  const allDemonstration = counts !== null && counts.demonstration > 0 && counts.real === 0;
  // Without an answer from the database the notice still explains the badge, but claims no count.
  const showNotice = counts === null || counts.demonstration > 0;

  return (
    <>
      <Breadcrumbs trail={[{ href: "/how-verification-works", label: "How we verify" }]} />

      <section aria-labelledby="verify-heading" className="border-b border-line bg-card">
        <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <p className="rn-eyebrow">Trust and verification</p>
            <h1 id="verify-heading" className="rn-h1 mt-3 max-w-[18ch]">
              How we verify dealerships
            </h1>
            <p className="rn-lead mt-4 max-w-2xl">
              Only registered dealerships we have checked can list on Rynet, and there is no way for
              a private seller to join. Here is exactly what we check, and what verification does
              not cover.
            </p>

            {counts && counts.real > 0 ? (
              <p className="mt-4 text-sm font-semibold text-heading">
                {counts.real} verified {counts.real === 1 ? "dealership" : "dealerships"} on Rynet
              </p>
            ) : null}

            {showNotice ? (
              <Notice
                compact
                title={
                  allDemonstration
                    ? "Every dealership on Rynet today is a demonstration, not a verified business."
                    : "A Demo dealership has not been through these checks."
                }
                details="What that means"
                className="mt-8 max-w-2xl"
              >
                {allDemonstration
                  ? "They show how the marketplace works. None of them has been through these checks, so each one carries a Demo dealership badge instead of a verified one."
                  : "A dealership marked Demo dealership shows how the marketplace works. It has not been through these checks and is not a real business."}
              </Notice>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dealers"
                className={buttonClasses({ variant: "outline", block: "mobile" })}
              >
                Browse dealerships
              </Link>
              <a href="#for-dealerships" className="rn-link-arrow min-h-11">
                Run a dealership?
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>

          {/*
            A specimen of a dealership listing, drawn in HTML, with what the verified badge stands
            for. It sits in a dashed frame marked Example, and the caption says it is not a real
            dealership before anything else. The badge itself is drawn as a grey dashed outline
            that names itself an example, never the green stamp: on a page whose notice says no
            dealership is verified yet, a green "Verified dealership" is the one thing a skimming
            buyer would take away.
          */}
          <figure className="relative min-w-0 rounded-lg border-2 border-dashed border-line-control p-3 pt-5 sm:p-4 sm:pt-6">
            <span className="absolute -top-3 left-4 rounded-full bg-page px-2.5 text-xs font-semibold text-heading ring-1 ring-line-control">
              Example
            </span>
            <figcaption className="mb-3 px-1 text-base font-medium text-heading">
              Specimen. Not a real dealership.
            </figcaption>
            <div className="rn-panel p-5 sm:p-6">
              <p className="rn-eyebrow">What a verified badge stands for</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-line bg-page p-4">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-sm bg-secondary text-base font-bold text-on-secondary"
                >
                  SM
                </span>
                <div className="min-w-0 flex-1 basis-36">
                  <p className="font-semibold text-heading">Specimen Motors</p>
                  <p className="text-sm text-muted">A town, a province</p>
                </div>
                <span className="rn-badge border border-dashed border-line-control bg-transparent text-body">
                  <BadgeCheck aria-hidden="true" />
                  Example of the verified badge
                </span>
              </div>

              <ol className="mt-5 space-y-3.5">
                {[
                  "Its registered name is on record and checked against CIPC",
                  "Rynet staff set it to verified, not the dealership",
                  "Any membership shown was added by Rynet",
                ].map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm text-body">
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-subtle text-xs font-semibold text-heading tabular"
                    >
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------------------------ checks */}
      <section aria-labelledby="checks-heading" className="container-page py-[var(--section-base)]">
        <div className="max-w-2xl">
          <p className="rn-eyebrow">Before a dealership can list</p>
          <h2 id="checks-heading" className="rn-h2 mt-2">
            What we check
          </h2>
          <p className="mt-3 text-body">
            What Rynet looks at before a dealership is marked verified.
          </p>
        </div>

        <ol className="mt-6 grid border-t border-line md:mt-8 md:gap-4 md:border-0 md:grid-cols-2">
          {CHECKS.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="border-b border-line py-6 md:rounded-md md:border md:bg-card md:p-7 md:shadow-card"
            >
              <div className="flex items-center justify-between gap-4">
                <span aria-hidden="true" className="rn-icon-tile rn-icon-tile--lg">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-semibold text-muted tabular">
                  Check {index + 1} of {CHECKS.length}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-body">{body}</p>
            </li>
          ))}
        </ol>

        <div className="rn-card mt-4 gap-6 p-6 sm:p-7 lg:flex-row lg:gap-12">
          <div className="min-w-0 lg:w-72 lg:shrink-0">
            <h3 className="text-xl font-semibold">What a dealership&apos;s record holds</h3>
            <p className="mt-2 text-sm text-body">
              Every dealership on Rynet has one, and these are the parts verification rests on.
            </p>
          </div>
          <dl className="grid min-w-0 flex-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {RECORD.map((item) => (
              <div key={item.term} className="min-w-0 border-t border-line pt-3">
                <dt className="font-semibold text-heading">{item.term}</dt>
                <dd className="mt-0.5 text-body">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- what you can rely on */}
      <section aria-labelledby="rely-heading" className="border-y border-line bg-card">
        <div className="container-page grid gap-10 py-[var(--section-base)] lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <p className="rn-eyebrow">For buyers</p>
            <h2 id="rely-heading" className="rn-h2 mt-2">
              What you can rely on
            </h2>
            <ul className="mt-6 space-y-5">
              {RELY_ON.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-success-subtle text-success"
                  >
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-body">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="rounded-lg bg-subtle p-6 sm:p-8">
              <h2 id="limits-heading" className="rn-h3">
                What verification does not cover
              </h2>
              <ul className="mt-5 space-y-4">
                {NOT_COVERED.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-body">
                    <CircleX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-line-strong pt-5 font-semibold text-heading">
                Still get an independent inspection and check the car yourself. Verification means
                the seller is real and traceable. It does not replace looking at the car.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- reporting */}
      <section aria-labelledby="report-heading" className="container-page py-[var(--section-base)]">
        <div className="rn-card flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-4">
            <span aria-hidden="true" className="rn-icon-tile rn-icon-tile--lg">
              <Flag className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 id="report-heading" className="rn-h3">
                Something not as the listing said?
              </h2>
              <p className="mt-2 max-w-2xl text-body">
                If you dealt with a dealership on Rynet and it did not go the way the listing
                suggested, tell us which one and what happened. Rynet staff can suspend a
                dealership.
              </p>
            </div>
          </div>
          <a
            href="mailto:report@rynet.co.za"
            className={buttonClasses({
              variant: "outline",
              block: "mobile",
              className: "shrink-0",
            })}
          >
            <Mail aria-hidden="true" />
            report@rynet.co.za
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------- dealer band */}
      {/* A rounded navy panel on the page ground, as on /dealers, so it never merges into the footer. */}
      <section
        id="for-dealerships"
        aria-labelledby="dealer-heading"
        className="container-page pb-[var(--section-base)]"
      >
        <div className="on-navy grid gap-8 rounded-lg px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-14">
          <div className="flex min-w-0 gap-5">
            <span
              aria-hidden="true"
              className="hidden size-14 shrink-0 place-items-center rounded-md bg-navy-raised text-on-navy sm:grid"
            >
              <Store className="size-7" />
            </span>
            <div className="min-w-0">
              <p className="rn-eyebrow text-on-navy-muted">For dealerships</p>
              <h2 id="dealer-heading" className="rn-h2 mt-2">
                Run a dealership?
              </h2>
              <p className="mt-3 max-w-2xl">
                To be verified we need your CIPC registration, your VAT number if you are registered
                for VAT, and proof of your trading address. Once you are verified, your stock can go
                live.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact#dealerships"
              className={buttonClasses({ size: "lg", block: "mobile" })}
            >
              List your dealership
            </Link>
            <Link
              href="/digital"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              Marketing for dealerships
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
