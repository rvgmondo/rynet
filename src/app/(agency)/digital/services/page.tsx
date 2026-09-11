import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SERVICES } from "@/content/agency/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Websites, stock feeds, paid media, local search, photography, CRM and lead routing, and reporting. Seven services, for car dealerships only.",
  alternates: { canonical: "/digital/services" },
};

export default function ServicesIndexPage() {
  return (
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/digital/services", label: "Services" }]} />

          <h1 className="rn-head mt-8 max-w-[12ch]">What we do</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            Seven services, all of them for car dealerships. Most dealerships need three or four.
            Each page below says what is actually delivered and where the line is, because a
            services page that only lists reassurances is a brochure.
          </p>
        </div>
      </section>

      {/*
        The index again, one level deeper.
        ----------------------------------
        The home page lists these seven as names. This page lists them as arguments, with the
        limit of each one carried at the same weight as the promise. Same device either way,
        because a visitor arriving from the home page should recognise where they are rather
        than meet a different site's layout one click in.

        "Where the line is" gets its own column rather than a footnote under a card. It is the
        sentence that separates this from a brochure and it was set in the smallest, palest
        type on the page.
      */}
      <section className="container-page py-[var(--section-base)]">
        <ol className="border-t border-line">
          {SERVICES.map(({ slug, name, title, summary, notThis }, index) => (
            <li key={slug} className="border-b border-line">
              <Link
                href={`/digital/services/${slug}`}
                className="group grid gap-4 py-8 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse lg:grid-cols-[4rem_1fr_1fr_2rem] lg:gap-10 lg:px-4"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-2xl font-extrabold tabular text-ink-muted group-hover:text-ink-inverse [font-variation-settings:'wdth'_112]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span>
                  <span className="rn-label block text-ink-muted group-hover:text-ink-inverse">
                    {name}
                  </span>
                  <h2 className="mt-3 font-display text-xl font-bold leading-snug">{title}</h2>
                  <span className="rn-prose mt-3 block text-ink-secondary group-hover:text-ink-inverse">
                    {summary}
                  </span>
                </span>

                <span className="border-t border-line pt-4 group-hover:border-ink-inverse/30 lg:border-l lg:border-t-0 lg:ps-10 lg:pt-0">
                  <span className="rn-label block text-ink-muted group-hover:text-ink-inverse">
                    Where the line is
                  </span>
                  <span className="rn-prose mt-3 block text-ink-secondary group-hover:text-ink-inverse">
                    {notThis[0]}
                  </span>
                </span>

                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-4 shrink-0 self-center lg:block"
                />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="services-cta" className="container-page pb-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <h2 id="services-cta" className="rn-head max-w-[14ch]">
            Not sure which of these you need?
          </h2>
          <div>
            <p className="rn-prose text-ink-secondary">
              Send us your site. We will tell you what we would fix first and in what order, and if
              the honest answer is that you do not need us yet, we will say that instead.
            </p>
            <Link
              href="/digital/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
