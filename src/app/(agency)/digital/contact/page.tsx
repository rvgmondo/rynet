import { Clock, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { QualificationForm } from "@/components/agency/qualification-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "Get in touch",
  description:
    "Tell us about your dealership and get a free written review of your site, your stock feed and your advertising. We reply within one working day.",
  alternates: { canonical: "/digital/contact" },
  // Nothing here is worth a search result on its own, and the form is the point.
  robots: { index: true, follow: true },
};

export default function AgencyContactPage() {
  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/digital/contact", label: "Get in touch" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">Start with the free review</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Three short steps. You get a written review of what is slowing your site down, what is
          stopping it being found, and what we would fix first. If the honest answer is that you do
          not need us yet, that is what the review will say.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <QualificationForm />

        <aside className="space-y-6">
          <div className="rounded-lg bg-surface-sunken p-6">
            <h2 className="text-lg">Would rather just email?</h2>
            <ul className="mt-4 space-y-4 text-sm text-ink-secondary">
              <li className="flex gap-3">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <a href="mailto:digital@rynet.co.za" className="font-semibold">
                  digital@rynet.co.za
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <span>Pretoria, Gauteng</span>
              </li>
              <li className="flex gap-3">
                <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <span>We reply within one working day, and usually the same day.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-line p-6">
            <h2 className="text-lg">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm text-ink-secondary">
              <li>
                <span className="font-semibold text-ink">1.</span> We reply to confirm what we are
                looking at and ask for read only access if you have analytics or ad accounts.
              </li>
              <li>
                <span className="font-semibold text-ink">2.</span> Two to three days later you get
                the written review, whether or not anything comes of it.
              </li>
              <li>
                <span className="font-semibold text-ink">3.</span> If it is useful, we book an hour
                to go through it. No obligation and no pressure at that point either.
              </li>
            </ol>
            <p className="mt-4 text-xs text-ink-muted">
              Read <Link href="/digital/process">how we work</Link> for what happens after that.
            </p>
          </div>

          <div className="rounded-lg border border-line p-6">
            <h2 className="text-lg">Selling a car, not buying services?</h2>
            <p className="mt-3 text-sm text-ink-secondary">
              If you want to list your stock on the Rynet marketplace rather than hire the agency,
              that is a different conversation and it is free.
            </p>
            <Link
              href="/how-verification-works"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
            >
              How dealership verification works
            </Link>
          </div>

          <p className="text-xs text-ink-muted">
            What you send us is handled under our <Link href="/privacy">privacy notice</Link>. We do
            not pass it to any dealership and we do not use it for anything except replying to you.
          </p>
        </aside>
      </div>
    </div>
  );
}
