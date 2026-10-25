import { ArrowRight, BadgeCheck, Check, ChevronDown, HandCoins, Store } from "lucide-react";
import Link from "next/link";

import type { PhotoCreditLine } from "@/components/home/home-stock";
import { buttonClasses } from "@/components/ui/button-classes";
import { VERIFICATION_CHECKS } from "@/content/verification-checks";

/**
 * The checks, in the order a dealership goes through them, read from the same list as
 * /how-verification-works (src/content/verification-checks.ts) so this summary can never promise
 * more than the full page.
 *
 * Drawn as the file a dealership has on Rynet: four checks, each ticking as it scrolls into view,
 * and the status at the top turning from Pending to Verified once they are all done. That is the
 * order the code enforces (a dealership starts pending; only staff verify it), shown rather than
 * listed. Where scroll-driven animation is not supported, or motion is reduced, the file simply
 * shows as verified with every check ticked.
 */
export function VerificationSteps() {
  return (
    <section
      aria-labelledby="checks-heading"
      className="rn-defer border-y border-line bg-card py-[var(--section-base)]"
    >
      <div className="container-page grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="rn-eyebrow">Before a dealership can list</p>
          <h2 id="checks-heading" className="rn-h2 mt-2">
            No car goes live until the business behind it is checked
          </h2>
          <p className="mt-3 text-body">
            Every dealership starts as pending, and a person at Rynet checks it before a single car
            can go live. The checks cover the business, not the car itself, so still look the car
            over properly, or have it inspected, before you buy.
          </p>
          <Link href="/how-verification-works" className="rn-link-arrow mt-5 min-h-11">
            Read how we verify dealerships
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="rn-checkfile rn-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-subtle/60 px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold text-heading">A dealership&apos;s file on Rynet</p>
            <p className="rn-checkfile__status text-xs font-semibold">
              <span className="rn-checkfile__pending">Pending</span>
              <span className="rn-checkfile__verified">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Verified
              </span>
            </p>
          </div>
          <ol className="divide-y divide-line">
            {VERIFICATION_CHECKS.map((check) => {
              const Icon = check.icon;
              return (
                <li key={check.title} className="rn-checkfile__row flex gap-4 px-5 py-5 sm:px-6">
                  <span className="rn-icon-tile shrink-0">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="rn-h3 text-lg leading-snug">{check.title}</h3>
                    <p className="mt-1 text-sm text-body">{check.summary}</p>
                  </div>
                  <span aria-hidden="true" className="rn-checkfile__tick">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/**
 * The two other doors: a private seller offering a car to dealerships, and a dealership asking to
 * list. One panel split down the middle from 1024px (a line between them on a phone), not two tall
 * cards: they are the page's closing routes, not its headline, and two 32px headings side by side
 * shouted as loud as the sections above them.
 *
 * Nothing here promises a price, a response time or a number of offers, and it gives no count of
 * dealerships: a seller reads "a shortlist" everywhere, and the ceiling stays in the code. The
 * sell half says what /sell-to-a-dealer says: verified dealerships in the seller's province, no
 * public listing, no cut, and that there may not be a dealership near the seller yet. The
 * dealership half sends applications to the dealer address on /contact, which asks for exactly
 * the details named here.
 */
export function SellAndListBands() {
  return (
    <div className="rn-defer container-page py-[var(--section-base)]">
      <div className="rn-panel grid overflow-hidden lg:grid-cols-2">
        <section
          aria-labelledby="sell-heading"
          className="flex flex-col p-6 sm:p-8 lg:p-10 xl:p-12"
        >
          <p className="flex items-center gap-3">
            <span className="rn-icon-tile">
              <HandCoins aria-hidden="true" className="size-5" />
            </span>
            <span className="rn-eyebrow">Selling a car</span>
          </p>
          <h2 id="sell-heading" className="rn-h3 mt-5 text-[1.375rem] sm:text-2xl">
            Offer it to dealerships, not to the public
          </h2>
          <p className="mt-3 max-w-[34rem] text-body">
            Tell us what you drive and we match it with verified dealerships in your province that
            buy that kind of car, so they can make you an offer. Your car is never listed on the
            site, and Rynet takes no cut.
          </p>
          <p className="mt-3 max-w-[34rem] text-sm text-muted">
            We are signing dealerships now, so there may not be one near you yet. If we cannot place
            your car, we email you and say so.
          </p>
          <div className="mt-auto pt-7">
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
          className="flex flex-col border-t border-line bg-subtle/60 p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10 xl:p-12"
        >
          <p className="flex items-center gap-3">
            <span className="rn-icon-tile bg-card">
              <Store aria-hidden="true" className="size-5" />
            </span>
            <span className="rn-eyebrow">For dealerships</span>
          </p>
          <h2 id="list-heading" className="rn-h3 mt-5 text-[1.375rem] sm:text-2xl">
            List your stock where every seller is checked
          </h2>
          <p className="mt-3 max-w-[34rem] text-body">
            On Rynet every seller is a registered business that has been checked, and a buyer can
            see which dealership they are dealing with before they call. We load your cars from your
            website or stock sheet, so you never retype one.
          </p>
          <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <Link
              href="/list-your-stock"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              List your stock
            </Link>
            <Link href="/digital" className="rn-link-arrow min-h-11 whitespace-normal">
              Marketing from Rynet Digital
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

/**
 * The page's last word goes back to its first: one search box, the same plain-language search as
 * the floor at the top, for the buyer who has scrolled the whole page without finding the car.
 * A plain GET form, so it works before scripts load and with scripting off.
 */
export function ClosingSearch({ total }: { total: number }) {
  return (
    <section
      aria-labelledby="closing-heading"
      className="rn-defer container-page pb-[var(--section-base)]"
    >
      <div className="on-navy rounded-xl border border-line-on-navy bg-navy-raised px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 id="closing-heading" className="rn-h2 text-on-navy">
            Still looking? <span className="text-brand-red">Say the car.</span>
          </h2>
          <p className="mt-3 text-on-navy-muted">
            Type it the way you would say it: a make, a body type, a budget or a monthly amount.
          </p>
          <search className="mt-7">
            <form action="/cars" method="get" className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="closing-q" className="sr-only">
                What car are you looking for?
              </label>
              <input
                id="closing-q"
                name="q"
                type="search"
                maxLength={200}
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Try: diesel bakkie under R 300 000"
                className="rn-input rn-input--lg min-w-0 flex-1"
              />
              <button type="submit" className={buttonClasses({ variant: "primary", size: "lg" })}>
                {total > 0 ? `Search ${total.toLocaleString("en-ZA")} cars` : "Search cars"}
              </button>
            </form>
          </search>
        </div>
      </div>
    </section>
  );
}
