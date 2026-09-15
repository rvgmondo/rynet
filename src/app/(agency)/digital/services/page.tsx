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
 * Seven rich cards, one per service, each a single link to its page. The home page introduces
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
        <ul className="container-page grid gap-5 md:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.slug} className="flex">
              <article className="rn-card rn-card--interactive p-6 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:bg-transparent max-sm:px-0 max-sm:pt-0 max-sm:shadow-none sm:p-8">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-on-secondary">
                    <service.Icon aria-hidden="true" className="size-6" />
                  </span>
                  <p className="text-sm font-semibold text-muted">{service.name}</p>
                </div>

                <h2 className="rn-h3 mt-5">
                  <Link
                    href={`/digital/services/${service.slug}`}
                    className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-[color:var(--rn-focus-ring)]"
                  >
                    {service.title}
                  </Link>
                </h2>
                <p className="mt-3 text-body">{service.summary}</p>

                <div className="mt-6 rounded-md bg-subtle p-4">
                  <p className="text-sm font-semibold text-heading">What you walk away with</p>
                  <p className="mt-1 text-sm text-body">{service.outcome}</p>
                </div>

                <span aria-hidden="true" className="rn-link-arrow mt-auto self-start pt-6">
                  What is included
                  <ArrowRight />
                </span>
              </article>
            </li>
          ))}

          <li className="flex">
            <div className="flex w-full flex-col justify-center rounded-md border border-dashed border-line-strong p-6 sm:p-8">
              <h2 className="rn-h3">Not sure where to start?</h2>
              <p className="mt-3 text-body">
                The free review puts these seven in order for your dealership: what to fix first,
                what can wait, and what you do not need at all.
              </p>
              <Link href="/digital/process" className="rn-link-arrow mt-5 self-start">
                How an engagement runs
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </li>
        </ul>
      </section>

      <AgencyClose id="services-close" title="Find out which of these you need">
        Send us your site. We will tell you what we would fix first and in what order, and if the
        honest answer is that you do not need us yet, we will say that instead.
      </AgencyClose>
    </>
  );
}
