import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AgencyClose } from "@/components/agency/agency-close";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { SERVICES } from "@/content/agency/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Websites, stock feeds, paid media, local search, photography, CRM and lead routing, and reporting. Seven services, for car dealerships only.",
  alternates: { canonical: "/digital/services" },
};

/**
 * The services index.
 *
 * One ruled sheet with a row per service, each row a single link to its page. The home page introduces
 * the services by name and summary; this page leads with the outcome each one is for and what a
 * dealer walks away with, so the two lists say different things. What is included and where the
 * line is live on each service's own page.
 *
 * e2e/agency.spec.ts counts exactly seven distinct service links in `main` here, so nothing
 * else on this page links to a service page.
 */
export default function ServicesIndexPage() {
  return (
    <>
      <AgencyPageHead
        trail={[{ href: "/digital/services", label: "Services" }]}
        eyebrow="Services"
        title="Seven services, all for car dealerships"
        lead="Each one exists because of something that costs a dealership sales: a slow site, stock that is wrong, ad spend nobody can trace, leads left waiting. Start with the one that costs you most."
        aside={
          <nav
            aria-label="Services on this page"
            className="rounded-lg border border-line bg-page p-2"
          >
            <ol className="divide-y divide-line">
              {SERVICES.map((service, index) => (
                <li key={service.slug}>
                  <Link
                    href={`/digital/services/${service.slug}`}
                    className="group flex min-h-12 items-center gap-3 rounded-sm px-3 text-[0.9375rem] font-medium text-heading no-underline hover:bg-subtle"
                  >
                    <span aria-hidden="true" className="w-5 text-sm text-muted tabular">
                      {index + 1}
                    </span>
                    <service.Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">{service.name}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        }
      />

      <section aria-label="All services" className="py-[var(--section-base)]">
        <div className="container-page">
          {/*
            One ruled sheet, a row per service, rather than seven cards: the number, the service
            and its icon; the outcome as a headline with the summary; and what the dealer walks
            away with, set off by a rule. The whole row is the one link, and its focus ring is
            drawn inside the sheet so the sheet's rounded edge never clips it.
          */}
          <ol className="rn-panel divide-y divide-line overflow-hidden">
            {SERVICES.map((service, index) => (
              <li
                key={service.slug}
                className="group relative grid gap-5 p-6 transition-colors duration-[var(--duration-micro)] hover:bg-subtle sm:p-8 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,19rem)] lg:gap-12 lg:px-10 lg:py-9"
              >
                <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
                  <span className="rn-icon-tile rn-icon-tile--lg">
                    <service.Icon aria-hidden="true" className="size-6" />
                  </span>
                  <p className="flex items-baseline gap-2 text-sm font-semibold text-heading">
                    <span aria-hidden="true" className="text-muted tabular">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {service.name}
                  </p>
                </div>

                <div className="min-w-0">
                  <h2 className="rn-h3">
                    <Link
                      href={`/digital/services/${service.slug}`}
                      className="transition-colors duration-[var(--duration-micro)] group-hover:text-accent after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-solid focus-visible:after:outline-[color:var(--rn-focus-ring)]"
                    >
                      {service.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-body">{service.summary}</p>
                  <span aria-hidden="true" className="rn-link-arrow mt-4">
                    What is included
                    <ArrowRight />
                  </span>
                </div>

                <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                  <p className="rn-eyebrow">What you walk away with</p>
                  <p className="mt-2 font-semibold leading-snug text-heading">{service.outcome}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-dashed border-line-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
            <div>
              <h2 className="text-lg font-semibold text-heading">Not sure where to start?</h2>
              <p className="mt-1 text-body">
                The free review puts these seven in order for your dealership: what to fix first,
                what can wait, and what you do not need at all.
              </p>
            </div>
            <Link
              href="/digital/process"
              className="rn-link-arrow shrink-0 self-start sm:self-center"
            >
              How an engagement runs
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <AgencyClose id="services-close" title="Find out which of these you need">
        Send us your site. We will tell you what we would fix first and in what order, and if the
        honest answer is that you do not need us yet, we will say that instead.
      </AgencyClose>
    </>
  );
}
