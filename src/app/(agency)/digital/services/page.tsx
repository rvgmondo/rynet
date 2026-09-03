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
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/digital/services", label: "Services" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">What we do</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Seven services, all of them for car dealerships. Most dealerships need three or four. Each
          page below says what is actually delivered and where the line is, because a services page
          that only lists reassurances is a brochure.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 lg:grid-cols-2">
        {SERVICES.map(({ slug, Icon, name, title, summary, notThis }) => (
          <li key={slug}>
            <article className="group relative flex h-full flex-col rounded-lg border border-line p-6 transition-shadow duration-[var(--duration-element)] hover:shadow-(--rn-shadow-2)">
              <div className="flex items-center gap-3">
                <Icon aria-hidden="true" className="size-6 shrink-0 text-accent" />
                <p className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-ink-muted">
                  {name}
                </p>
              </div>

              <h2 className="mt-3 text-xl leading-snug">
                <Link
                  href={`/digital/services/${slug}`}
                  className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
                >
                  {title}
                </Link>
              </h2>

              <p className="mt-3 text-sm text-ink-secondary">{summary}</p>

              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">
                <span className="font-semibold text-ink-secondary">Where the line is: </span>
                {notThis[0]}
              </p>

              <p className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                Read more
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </p>
            </article>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="services-cta"
        className="mt-[var(--section-base)] rounded-lg bg-surface-sunken p-8"
      >
        <h2 id="services-cta" className="text-2xl">
          Not sure which of these you need?
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Send us your site. We will tell you what we would fix first and in what order, and if the
          honest answer is that you do not need us yet, we will say that instead.
        </p>
        <Link
          href="/digital/contact"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
        >
          Get in touch
        </Link>
      </section>
    </div>
  );
}
