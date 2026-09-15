import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AGENCY_EMAIL, NEXT_STEPS, REVIEW_CTA } from "@/components/agency/agency-content";
import { buttonClasses } from "@/components/ui/button-classes";

/**
 * The close at the foot of every agency page except the contact page, which is the form.
 *
 * One component so the ending is decided once. Only the heading and the first paragraph change
 * per page; the rest is the offer itself: the review button, the mailbox, the reply commitment
 * the form also makes, and the three things that actually happen next.
 *
 * A navy panel on the page ground, set in from the edges, so it reads as a distinct object
 * above the navy footer rather than running into it.
 */
export function AgencyClose({
  id,
  title,
  children,
  secondary,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
  /** Replaces the email button, for a page with a better second route. */
  secondary?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="container-page pb-[var(--section-base)]">
      <div className="on-navy relative overflow-hidden rounded-lg px-5 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow text-on-navy-muted">Free, with no obligation</p>
            <h2 id={id} className="rn-h2 mt-3">
              {title}
            </h2>
            <div className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed">{children}</div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={REVIEW_CTA.href}
                className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
              >
                {REVIEW_CTA.label}
                <ArrowRight aria-hidden="true" />
              </Link>
              {secondary ?? (
                <a
                  href={`mailto:${AGENCY_EMAIL}`}
                  className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
                >
                  <Mail aria-hidden="true" />
                  {AGENCY_EMAIL}
                </a>
              )}
            </div>
            <p className="mt-4 text-sm">We reply by email.</p>
          </div>

          <div className="lg:border-l lg:border-line-on-navy lg:ps-16">
            <h3 className="text-base font-semibold">What happens next</h3>
            <ol className="mt-5 space-y-5">
              {NEXT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-raised text-sm font-semibold text-on-navy tabular"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="font-semibold text-on-navy">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
