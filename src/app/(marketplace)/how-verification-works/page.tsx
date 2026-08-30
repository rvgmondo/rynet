import { BadgeCheck, Building2, FileCheck2, ShieldOff, UserX } from "lucide-react";
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
 */
export default function HowVerificationWorksPage() {
  const checks = [
    {
      Icon: Building2,
      title: "The business is real and registered",
      body: "We check the CIPC company registration against the trading name, and confirm the business is in good standing. A dealership trading under a name that does not match a registered entity does not get listed.",
    },
    {
      Icon: FileCheck2,
      title: "The paperwork holds up",
      body: "VAT registration where the turnover requires it, and a motor trade number where the dealership holds one. We ask for proof of the trading address, not just a postal one, because an address you cannot visit is not an address.",
    },
    {
      Icon: BadgeCheck,
      title: "Industry membership, where they claim it",
      body: "If a dealership displays RMI, NADA, MIWA or SAMBRA membership on their profile, we have seen the certificate. We do not take the badge off a website and repeat it.",
    },
    {
      Icon: UserX,
      title: "A named person signs off, and it is recorded",
      body: "Verification is a decision made by someone at Rynet, not a form that passes itself. Every decision is recorded with who made it, when, and on what evidence, so it can be looked at again.",
    },
  ];

  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/how-verification-works", label: "How verification works" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">How we verify dealerships</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Every vehicle on Rynet comes from a registered dealership we have checked. There are no
          private sellers, and there is no way to become one. That is the whole point of the
          platform, so it is worth being precise about what it does and does not mean.
        </p>
      </div>

      <section aria-labelledby="checks-heading" className="mt-12">
        <h2 id="checks-heading" className="text-2xl">
          What we check before a dealership can list
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {checks.map(({ Icon, title, body }) => (
            <li key={title} className="rounded-lg border border-line p-5">
              <Icon aria-hidden="true" className="size-6 text-accent" />
              <h3 className="mt-3 text-base">{title}</h3>
              <p className="mt-2 text-sm text-ink-secondary">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="not-heading" className="mt-14">
        <h2 id="not-heading" className="text-2xl">
          What the badge does not mean
        </h2>
        <div className="measure mt-4 rounded-lg border-2 border-line-interactive p-6">
          <p className="flex items-start gap-3 text-ink-secondary">
            <ShieldOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            <span>
              <strong className="font-semibold text-ink">We have not inspected the vehicle.</strong>{" "}
              Verification is about the business, not the car. We have not driven it, put it on a
              lift, or checked the odometer against the service record.
            </span>
          </p>
          <ul className="mt-4 space-y-2 pl-8 text-sm text-ink-secondary">
            <li className="list-disc">
              We do not check that the mileage, service history or condition on a listing is
              accurate. The dealership supplies that, and they are responsible for it.
            </li>
            <li className="list-disc">
              We do not run a finance, accident or stolen-vehicle check on individual cars.
            </li>
            <li className="list-disc">
              A verified dealership is not a guarantee of a good deal or good service. It is a
              guarantee that you know who you are dealing with.
            </li>
          </ul>
          <p className="mt-5 text-sm text-ink-secondary">
            Still get an independent inspection before you buy, and still check the vehicle
            yourself. Verification means the seller is real and traceable. It does not replace
            looking at the car.
          </p>
        </div>
      </section>

      <section aria-labelledby="ongoing-heading" className="mt-14">
        <h2 id="ongoing-heading" className="text-2xl">
          It is not a one-off
        </h2>
        <div className="measure mt-4 space-y-4 text-ink-secondary">
          <p>
            A dealership can be suspended, and a suspended one disappears from the site immediately,
            along with all of its stock. It does not stay up greyed out, because a half-listed
            business on a platform that promises verification is worse than none.
          </p>
          <p>
            We suspend for the obvious reasons: the registration lapses, the business stops trading,
            or a pattern of complaints suggests the listings are not what they say. We also pull
            individual listings that look wrong, such as a price far below market, a duplicate VIN,
            or stock that has sat unchanged for months.
          </p>
          <p>
            If you have dealt with a dealership on Rynet and it did not go the way the listing
            suggested, tell us. That is the main way we find out.{" "}
            <Link href="/contact">Get in touch</Link>.
          </p>
        </div>
      </section>

      <section aria-labelledby="dealer-heading" className="mt-14 rounded-lg bg-surface-sunken p-8">
        <h2 id="dealer-heading" className="text-2xl">
          Run a dealership?
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Verification takes a few days and needs your CIPC registration, proof of your trading
          address and, where you hold them, your VAT and motor trade numbers.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent-solid px-5 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          Apply to list your stock
        </Link>
      </section>
    </div>
  );
}
