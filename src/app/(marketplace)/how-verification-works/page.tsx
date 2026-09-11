import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "How we verify dealerships",
  description:
    "Rynet only lists vehicles from registered dealerships we have checked. Here is exactly what we check, what the badge means, and what we do when a dealership stops meeting the standard.",
  alternates: { canonical: "/how-verification-works" },
};

/**
 * The trust proposition, made into a page.
 *
 * "Only verified dealerships" is the entire product argument, and a badge that links
 * nowhere is decoration. This is what the badge links to.
 *
 * It is deliberately specific about what is NOT checked. A trust page that only lists
 * reassurances is marketing; one that says where the line is can be relied on. A buyer who
 * thinks we have inspected the car is a buyer we have misled.
 *
 * REDRAWN. It was four bordered boxes with a small red icon in the corner of each, then a
 * bordered box, then a bordered panel, all set at the default type scale in a narrow column
 * with the right half of the screen empty. That is the layout of a help centre article, and
 * this is the page the verified badge points at from every card on the site: the single
 * document the whole product argument rests on. It now uses the same devices as the home
 * page, because it is making the same argument.
 */
export default function HowVerificationWorksPage() {
  const checks = [
    {
      title: "The business is real and registered",
      body: "We check the CIPC company registration against the trading name, and confirm the business is in good standing. A dealership trading under a name that does not match a registered entity does not get listed.",
    },
    {
      title: "The paperwork holds up",
      body: "VAT registration where the turnover requires it, and a motor trade number where the dealership holds one. We ask for proof of the trading address, not just a postal one, because an address you cannot visit is not an address.",
    },
    {
      title: "Industry membership, where they claim it",
      body: "If a dealership displays RMI, NADA, MIWA or SAMBRA membership on their profile, we have seen the certificate. We do not take the badge off a website and repeat it.",
    },
    {
      title: "A named person signs off, and it is recorded",
      body: "Verification is a decision made by someone at Rynet, not a form that passes itself. Every decision is recorded with who made it, when, and on what evidence, so it can be looked at again.",
    },
  ];

  return (
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs
            trail={[{ href: "/how-verification-works", label: "How verification works" }]}
          />

          <h1 className="rn-head mt-8 max-w-[16ch]">How we verify dealerships</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            Every vehicle on Rynet comes from a registered dealership we have checked. There are no
            private sellers, and there is no way to become one. That is the whole point of the
            platform, so it is worth being precise about what it does and does not mean.
          </p>
        </div>
      </section>

      {/*
        The four checks as a numbered index rather than four cards.
        ----------------------------------------------------------
        They are steps in an order, and a card grid says nothing about order. Numbering them
        also lets a dealership on the phone say "we are stuck on three", which is the actual
        use this page gets from the other side of the counter.
      */}
      <section aria-labelledby="checks-heading" className="container-page py-[var(--section-base)]">
        <h2 id="checks-heading" className="rn-head max-w-[20ch]">
          What we check before a dealership can list
        </h2>
        <hr className="rn-rule mt-6" />

        <ol className="mt-2">
          {checks.map((check, index) => (
            <li
              key={check.title}
              className="grid gap-2 border-b border-line py-7 md:grid-cols-[4rem_18rem_1fr] md:gap-8"
            >
              <span
                aria-hidden="true"
                className="font-display text-2xl font-extrabold tabular text-ink-muted [font-variation-settings:'wdth'_112]"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-xl font-bold leading-snug">{check.title}</h3>
              <p className="rn-prose text-ink-secondary">{check.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/*
        The limits of the badge, on the inverted ground.
        -----------------------------------------------
        This is the most valuable paragraph on the site and it was in a grey box below the
        fold. Any platform can list what it checks. Saying plainly what it does NOT check is
        the part a buyer cannot get anywhere else, and it is the part that makes the rest
        believable. It gets the ground that looks like a statement, which on this site is
        used exactly twice and both times for a claim we are prepared to be held to.
      */}
      <section aria-labelledby="not-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="not-heading" className="rn-head max-w-[14ch]">
            What the badge does not mean
          </h2>
          <hr className="mt-8 h-px border-0 bg-silver" />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <p className="rn-prose rn-prose--drop text-lg">
              <strong className="font-semibold">We have not inspected the vehicle.</strong>{" "}
              Verification is about the business, not the car. We have not driven it, put it on a
              lift, or checked the odometer against the service record.
            </p>

            <ul className="space-y-0">
              {[
                "We do not check that the mileage, service history or condition on a listing is accurate. The dealership supplies that, and they are responsible for it.",
                "We do not run a finance, accident or stolen-vehicle check on individual cars.",
                "A verified dealership is not a guarantee of a good deal or good service. It is a guarantee that you know who you are dealing with.",
              ].map((item) => (
                <li key={item} className="border-t border-silver/40 py-4 text-sm opacity-90">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="measure mt-10 text-lg">
            Still get an independent inspection before you buy, and still check the vehicle
            yourself. Verification means the seller is real and traceable. It does not replace
            looking at the car.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="ongoing-heading"
        className="container-page py-[var(--section-base)]"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="ongoing-heading" className="rn-head max-w-[10ch]">
            It is not a one-off
          </h2>

          <div className="space-y-5">
            <p className="rn-prose rn-prose--drop text-ink-secondary">
              A dealership can be suspended, and a suspended one disappears from the site
              immediately, along with all of its stock. It does not stay up greyed out, because a
              half-listed business on a platform that promises verification is worse than none.
            </p>
            <p className="rn-prose text-ink-secondary">
              We suspend for the obvious reasons: the registration lapses, the business stops
              trading, or a pattern of complaints suggests the listings are not what they say. We
              also pull individual listings that look wrong, such as a price far below market, a
              duplicate VIN, or stock that has sat unchanged for months.
            </p>
            <p className="rn-prose text-ink-secondary">
              If you have dealt with a dealership on Rynet and it did not go the way the listing
              suggested, tell us. That is the main way we find out.{" "}
              <Link href="/contact">Get in touch</Link>.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="dealer-heading" className="container-page pb-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <h2 id="dealer-heading" className="rn-head max-w-[12ch]">
            Run a dealership?
          </h2>
          <div>
            <p className="rn-prose text-ink-secondary">
              Verification takes a few days and needs your CIPC registration, proof of your trading
              address and, where you hold them, your VAT and motor trade numbers.
            </p>
            <Link
              href="/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
            >
              Apply to list your stock
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
