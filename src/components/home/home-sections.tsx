import { ArrowRight, ChevronDown, HandCoins, Store } from "lucide-react";
import Link from "next/link";

import type { PhotoCreditLine } from "@/components/home/home-stock";
import { buttonClasses } from "@/components/ui/button-classes";
import { VERIFICATION_CHECKS } from "@/content/verification-checks";

/**
 * The checks, in the order a dealership goes through them, read from the same list as
 * /how-verification-works (src/content/verification-checks.ts) so this summary can never promise
 * more than the full page.
 *
 * A short numbered list, not four cards: the full version, with every sentence, is one link away,
 * and the cards repeated it almost word for word. Each step is its title and one sentence.
 */
export function VerificationSteps() {
  return (
    <section
      aria-labelledby="checks-heading"
      className="rn-defer border-y border-line bg-card py-[var(--section-base)]"
    >
      <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="rn-eyebrow">Before a dealership can list</p>
          <h2 id="checks-heading" className="rn-h2 mt-2">
            How Rynet checks dealerships
          </h2>
          <p className="mt-3 text-body">
            The checks cover the business behind every listing, not the car itself. Still look the
            car over properly, or have it inspected, before you buy.
          </p>
          <Link href="/how-verification-works" className="rn-link-arrow mt-5 min-h-11">
            Read how we verify dealerships
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <ol className="grid gap-x-10 sm:grid-cols-2">
          {VERIFICATION_CHECKS.map((check, index) => (
            <li key={check.title} className="flex gap-4 border-t border-line py-5">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="rn-h3 text-lg leading-snug">{check.title}</h3>
                <p className="mt-1 text-sm text-body">{check.summary}</p>
              </div>
            </li>
          ))}
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
          className="rn-panel flex flex-col p-6 sm:p-8 lg:p-10"
        >
          <span className="rn-icon-tile rn-icon-tile--lg">
            <HandCoins aria-hidden="true" className="size-6" />
          </span>
          <h2 id="sell-heading" className="rn-h2 mt-6">
            Selling your car? Offer it to dealerships
          </h2>
          <p className="mt-4 max-w-[34rem] text-body">
            Tell us what you drive and we pass it to no more than five dealerships in your province
            that buy that kind of car, so they can make you an offer. Your car is never listed on
            the site, and Rynet takes no cut.
          </p>
          <p className="mt-3 max-w-[34rem] text-sm text-muted">
            We are signing dealerships now, so there may not be one near you yet. If we cannot place
            your car, we email you and say so.
          </p>
          <div className="mt-auto pt-8">
            <Link
              href="/sell-to-a-dealer"
              className={buttonClasses({ variant: "secondary", size: "lg", block: "mobile" })}
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
          <span className="rn-icon-tile rn-icon-tile--lg">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <h2 id="list-heading" className="rn-h2 mt-6">
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
    <div className="container-page pb-8">
      <details id="photo-credits" className="group border-t border-line pt-2 text-xs text-muted">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-body hover:text-heading [&::-webkit-details-marker]:hidden">
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
          <ul className="mt-2 grid gap-x-8 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
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
