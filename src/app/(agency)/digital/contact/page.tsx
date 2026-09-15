import { ArrowRight, Mail, MapPin, ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AGENCY_EMAIL, NEXT_STEPS } from "@/components/agency/agency-content";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { QualificationForm } from "@/components/agency/qualification-form";
import { COMPANY } from "@/content/company";

export const metadata: Metadata = {
  title: "Book a free review",
  description:
    "Tell us about your dealership and get a free written review of your site, your stock feed and your advertising, with what we would fix first.",
  alternates: { canonical: "/digital/contact" },
  robots: { index: true, follow: true },
};

/**
 * Where every "Book a free review" button lands.
 *
 * The form sits on a white panel, the widest thing on the page, with the reassurance beside it
 * from 1024px and under it on a phone: what happens after sending, the mailbox for anyone who
 * would rather write, a route for a dealership that wants to list stock rather than hire an
 * agency, and how the details are handled.
 *
 * Only real contact details. The town comes from src/content/company.ts; a phone number appears
 * only once the company has one. The consent wording inside the form carries the legal review
 * marker until an attorney has read it.
 */
export default function AgencyContactPage() {
  return (
    <>
      <AgencyPageHead
        trail={[{ href: "/digital/contact", label: "Book a free review" }]}
        eyebrow="Free review"
        title="Book a free review of your dealership's site"
        lead="Three short steps. You get a written review of what is slowing your site down, what is stopping it being found, and what we would fix first. If the honest answer is that you do not need us yet, the review says so."
      />

      <section aria-label="Review request" className="py-[var(--section-base)]">
        <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="rn-panel p-5 sm:p-8 lg:p-10">
            <QualificationForm />
          </div>

          <aside aria-label="About the review" className="grid gap-4">
            <div className="rn-card p-6">
              <h2 className="text-lg font-semibold text-heading">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="font-semibold text-heading">{step.title}</p>
                      <p className="mt-1 text-sm text-body">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="/digital/process" className="rn-link-arrow mt-6">
                How an engagement runs after that
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="rn-card p-6">
              <h2 className="text-lg font-semibold text-heading">Rather write to us?</h2>
              <ul className="mt-4 space-y-2 text-sm text-body">
                <li className="flex min-h-11 items-center gap-3">
                  <Mail aria-hidden="true" className="size-5 shrink-0 text-muted" />
                  <a
                    href={`mailto:${AGENCY_EMAIL}`}
                    className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-3 hover:text-accent-hover"
                  >
                    {AGENCY_EMAIL}
                  </a>
                </li>
                <li className="flex min-h-11 items-center gap-3">
                  <MapPin aria-hidden="true" className="size-5 shrink-0 text-muted" />
                  {COMPANY.streetAddress ?? COMPANY.town}
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted">We reply within one working day.</p>
            </div>

            <div className="rounded-md border border-line bg-subtle p-6">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-heading shadow-xs"
                >
                  <Store className="size-5" />
                </span>
                <h2 className="font-semibold text-heading">
                  Here to list stock, not hire an agency?
                </h2>
              </div>
              <p className="mt-3 text-sm text-body">
                Listing a dealership on Rynet Showroom is a separate conversation, and being an
                agency client has no bearing on it.
              </p>
              <Link href="/how-verification-works" className="rn-link-arrow mt-4">
                How dealerships are checked
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <p className="flex gap-3 px-1 text-sm text-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                What you send is handled under our{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-heading underline underline-offset-3 hover:text-accent"
                >
                  privacy notice
                </Link>
                . It is not passed to any dealership, and it is used only for this enquiry.
              </span>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
