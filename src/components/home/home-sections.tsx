import { ArrowRight, ChevronDown, HandCoins, Store } from "lucide-react";
import Link from "next/link";

import type { PhotoCreditLine } from "@/components/home/home-stock";
import { buttonClasses } from "@/components/ui/button-classes";
import { SectionHeader } from "@/components/ui/section-header";
import { VERIFICATION_CHECKS } from "@/content/verification-checks";

/**
 * The checks, in the order a dealership goes through them, read from the same list as
 * /how-verification-works (src/content/verification-checks.ts) so this summary can never promise
 * more than the full page.
 */
export function VerificationSteps() {
  return (
    <section
      aria-labelledby="checks-heading"
      className="rn-defer border-y border-line bg-card py-[var(--section-base)]"
    >
      <div className="container-page">
        <SectionHeader
          id="checks-heading"
          eyebrow="Before a dealership can list"
          title="How Rynet checks dealerships"
          lead="The checks cover the business behind every listing, not the car itself. Still look the car over properly, or have it inspected, before you buy."
          action={{ href: "/how-verification-works", label: "Read how we verify dealerships" }}
        />

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {VERIFICATION_CHECKS.map((check, index) => {
            const Icon = check.icon;
            return (
              <li key={check.title} className="flex flex-col rounded-md bg-page p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-card text-heading shadow-xs">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span aria-hidden="true" className="text-sm font-semibold text-muted">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="rn-h3 mt-4 text-lg sm:text-xl">{check.title}</h3>
                <p className="mt-2 text-body">{check.summary}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/**
 * The two other doors: a private seller offering a car to dealerships, and a dealership asking to
 * list. Side by side from 1024px, stacked on a phone.
 *
 * Nothing here promises a price, a response time or a number of offers. The sell panel says what
 * /sell-to-a-dealer says: no more than five dealerships, no public listing, no cut, and that there
 * may not be a dealership near the seller yet. The dealership panel sends applications to the
 * dealer address on /contact, which asks for exactly the details named here.
 */
export function SellAndListBands() {
  return (
    <div className="rn-defer container-page py-[var(--section-base)]">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section
          aria-labelledby="sell-heading"
          className="on-navy flex flex-col rounded-lg border border-line-on-navy p-6 sm:p-8 lg:p-10"
        >
          <span className="grid size-12 place-items-center rounded-md bg-navy-raised text-on-navy">
            <HandCoins aria-hidden="true" className="size-6" />
          </span>
          <h2 id="sell-heading" className="rn-h2 mt-6 text-on-navy lg:text-[2rem]">
            Selling your car? Offer it to dealerships
          </h2>
          <p className="mt-4 max-w-[34rem] text-on-navy-muted">
            Tell us what you drive and we pass it to no more than five dealerships in your province
            that buy that kind of car, so they can make you an offer. Your car is never listed on
            the site, and Rynet takes no cut.
          </p>
          <p className="mt-3 max-w-[34rem] text-sm text-on-navy-muted">
            We are signing dealerships now, so there may not be one near you yet. If we cannot place
            your car, we email you and say so.
          </p>
          <div className="mt-auto pt-8">
            <Link
              href="/sell-to-a-dealer"
              className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
            >
              Offer your car to dealerships
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="list-heading"
          className="rn-panel flex flex-col p-6 sm:p-8 lg:p-10"
        >
          <span className="grid size-12 place-items-center rounded-md bg-subtle text-heading">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <h2 id="list-heading" className="rn-h2 mt-6 lg:text-[2rem]">
            Run a dealership? List your stock on Rynet
          </h2>
          <p className="mt-4 max-w-[34rem] text-body">
            On Rynet every seller is a registered business that has been checked, and a buyer can
            see which dealership they are dealing with before they call. To apply, send us your
            trading name, your CIPC registration number and roughly how many cars you carry.
          </p>
          <div className="mt-auto flex flex-col gap-4 pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <Link
              href="/contact"
              className={buttonClasses({ variant: "secondary", size: "lg", block: "mobile" })}
            >
              Apply to list your stock
            </Link>
            <Link href="/digital" className="rn-link-arrow min-h-11 whitespace-normal">
              Marketing for dealerships from Rynet Digital
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The attribution the Commons licences ask for, for every photograph on the page, behind one
 * native disclosure. The hero credits its own photograph in its caption as well; cards and tiles
 * have no room for a credit line, so theirs live here.
 */
export function PhotoCredits({ credits }: { credits: PhotoCreditLine[] }) {
  if (credits.length === 0) return null;

  return (
    <div className="container-page pb-[var(--section-base)]">
      <details className="group rounded-md border border-line bg-card px-4 text-sm text-muted sm:px-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-heading [&::-webkit-details-marker]:hidden">
          Photograph credits
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted motion-safe:transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="pb-4">
          <p>
            The photographs on this page show each model, not the car listed. Credits as their
            licences require:
          </p>
          <ul className="mt-3 grid gap-x-8 gap-y-1.5 md:grid-cols-2">
            {credits.map((line) => (
              <li key={`${line.subject}|${line.credit}`}>
                <span className="font-medium text-body">{line.subject}:</span> {line.credit}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}
