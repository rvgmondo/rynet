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

/**
 * The end of every call to action on the agency site.
 *
 * REDRAWN. The form itself had already been rebuilt on the shared primitives, and it was sitting
 * beside three bordered boxes and an icon-and-line list carried straight over from the old build,
 * on a page that opened with no masthead band while all four other agency pages opened with the
 * same sunken, column-ruled one. So the page that closes the argument was the one page that
 * visibly belonged to a different site.
 */
export default function AgencyContactPage() {
  return (
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/digital/contact", label: "Get in touch" }]} />

          <h1 className="rn-head mt-8 max-w-[14ch]">Start with the free review</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            Three short steps. You get a written review of what is slowing your site down, what is
            stopping it being found, and what we would fix first. If the honest answer is that you
            do not need us yet, that is what the review will say.
          </p>
        </div>
      </section>

      <div className="container-page py-[var(--section-base)]">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-16">
          <QualificationForm />

          {/*
            The aside as one ruled column.
            ------------------------------
            It was three filled and bordered containers stacked on top of each other, each with its
            own heading, plus a list of three glyphs labelling an email address, a town and a
            sentence about turnaround. None of the three needed a container and none of the glyphs
            said anything the line beside it did not. What is left is what the reader came for,
            separated by rules.
          */}
          <aside className="lg:border-l lg:border-line lg:ps-16">
            <h2 className="rn-label text-ink-muted">Would rather just email</h2>
            <a
              href="mailto:digital@rynet.co.za"
              className="rn-label mt-3 inline-flex min-h-11 items-center text-ink underline decoration-line-interactive underline-offset-4 hover:decoration-ink"
            >
              digital@rynet.co.za
            </a>
            <p className="rn-label rn-label--light mt-2 text-ink-muted">
              Pretoria, Gauteng. We reply within one working day, and usually the same day.
            </p>

            <h2 className="rn-label mt-12 border-t border-line pt-8 text-ink-muted">
              What happens next
            </h2>
            <ol className="mt-4">
              {[
                "We reply to confirm what we are looking at, and ask for read only access if you have analytics or ad accounts.",
                "Two to three days later you get the written review, whether or not anything comes of it.",
                "If it is useful, we book an hour to go through it. No obligation and no pressure at that point either.",
              ].map((step, index) => (
                <li key={step} className="flex gap-5 border-b border-line py-4">
                  <span
                    aria-hidden="true"
                    className="font-display text-base font-extrabold tabular text-ink-muted [font-variation-settings:'wdth'_112]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-ink-secondary">{step}</span>
                </li>
              ))}
            </ol>
            <p className="rn-label rn-label--light mt-4 text-ink-muted">
              Read <Link href="/digital/process">how we work</Link> for what happens after that.
            </p>

            <h2 className="rn-label mt-12 border-t border-line pt-8 text-ink-muted">
              Selling a car, not buying services
            </h2>
            <p className="rn-prose mt-3 text-ink-secondary">
              If you want to list your stock on the Rynet marketplace rather than hire the agency,
              that is a different conversation and it is free.
            </p>
            <Link
              href="/how-verification-works"
              className="rn-label mt-4 inline-flex min-h-11 items-center text-ink underline decoration-line-interactive underline-offset-4 hover:decoration-ink"
            >
              How dealership verification works
            </Link>

            <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
              What you send us is handled under our <Link href="/privacy">privacy notice</Link>. We
              do not pass it to any dealership and we do not use it for anything except replying to
              you.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
