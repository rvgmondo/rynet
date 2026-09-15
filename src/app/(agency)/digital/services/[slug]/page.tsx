import { ArrowRight, Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgencyClose } from "@/components/agency/agency-close";
import { REVIEW_CTA, sentence } from "@/components/agency/agency-content";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { StageSteps } from "@/components/agency/stage-steps";
import { buttonClasses } from "@/components/ui/button-classes";
import { SectionHeader } from "@/components/ui/section-header";
import { SERVICES, serviceBySlug } from "@/content/agency/services";
import { serviceJsonLd } from "@/lib/structured-data";

/**
 * One template, seven pages.
 *
 * Seven hand-written pages would drift the first time one was edited in a hurry, and the drift
 * lands on the part nobody rereads, which here is "where the line is". Every service page reads
 * in the same order: the outcome, the problem it solves, what is included, how it runs, where
 * the line is, then the offer.
 */
export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) return {};

  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/digital/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) notFound();

  const { Icon, name, title, summary, includes, notThis, problem, outcome } = service;
  // The next three in the list, wrapping round, so every service links onward to different ones.
  const position = SERVICES.findIndex((item) => item.slug === slug);
  const others = [1, 2, 3].map((step) => SERVICES[(position + step) % SERVICES.length]);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            serviceJsonLd({
              name,
              description: summary,
              path: `/digital/services/${slug}`,
            }),
          ),
        }}
      />

      <AgencyPageHead
        trail={[
          { href: "/digital/services", label: "Services" },
          { href: `/digital/services/${slug}`, label: name },
        ]}
        eyebrow={name}
        title={title}
        lead={summary}
        actions={
          <>
            <Link
              href={REVIEW_CTA.href}
              className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
            >
              {REVIEW_CTA.label}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/digital/pricing"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              How we price
            </Link>
          </>
        }
        aside={
          <div className="on-navy rounded-lg p-6 shadow-card sm:p-8">
            <span className="rn-icon-tile rn-icon-tile--lg">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <p className="rn-eyebrow mt-6 text-on-navy-muted">What you walk away with</p>
            <p className="mt-2 text-xl leading-snug font-semibold text-on-navy">{outcome}</p>
          </div>
        }
      />

      <section aria-labelledby="problem-heading" className="py-[var(--section-base)]">
        <div className="container-page grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">Why it matters</p>
            <h2 id="problem-heading" className="rn-h2 mt-2">
              The problem
            </h2>
          </div>
          <p className="rn-lead max-w-3xl lg:pt-8">{problem}</p>
        </div>
      </section>

      <section aria-labelledby="includes-heading" className="bg-card py-[var(--section-base)]">
        {/*
          A heading column and a ruled checklist beside it, rather than six tinted boxes: the items
          are a specification to read down, not six things to click.
        */}
        <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="rn-eyebrow">{name}</p>
            <h2 id="includes-heading" className="rn-h2 mt-2">
              What is included
            </h2>
            <p className="mt-3 text-body">
              Each of these is something you can check once it is built, not a promise about
              results.
            </p>
          </div>
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
            {includes.map((item) => (
              <li key={item} className="flex gap-4 border-b border-line py-5">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success"
                >
                  <Check className="size-4" />
                </span>
                <span className="text-body">{sentence(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="how-heading"
            eyebrow="How it works"
            title="Five steps, and the first one is free"
            action={{ href: "/digital/process", label: "How we work, in detail" }}
          />
          <div className="mt-10">
            <StageSteps />
          </div>
        </div>
      </section>

      <section aria-labelledby="line-heading" className="pb-[var(--section-base)]">
        <div className="container-page">
          <div className="rn-panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16 lg:p-10">
            <div>
              <p className="rn-eyebrow">Where the line is</p>
              <h2 id="line-heading" className="rn-h3 mt-2">
                What this is not
              </h2>
              <p className="mt-2 text-sm text-muted">
                Worth knowing before you book, not after the quote.
              </p>
            </div>
            <ul className="space-y-4">
              {notThis.map((item) => (
                <li key={item} className="flex gap-3 text-body">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-muted"
                  >
                    <Minus className="size-3.5" />
                  </span>
                  <span>{sentence(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="others-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="others-heading"
            title="Other things we do"
            action={{ href: "/digital/services", label: "All services" }}
          />
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {others.map((other) =>
              other ? (
                <li key={other.slug} className="flex">
                  <article className="rn-card rn-card--interactive p-5">
                    <div className="flex items-center gap-3">
                      <span className="rn-icon-tile">
                        <other.Icon aria-hidden="true" className="size-5" />
                      </span>
                      <h3 className="text-base font-semibold text-heading">
                        <Link
                          href={`/digital/services/${other.slug}`}
                          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-[color:var(--rn-focus-ring)]"
                        >
                          {other.name}
                        </Link>
                      </h3>
                    </div>
                    <p className="mt-3 text-sm text-body">{other.summary}</p>
                    <span aria-hidden="true" className="rn-link-arrow mt-auto self-start pt-4">
                      Learn more
                      <ArrowRight />
                    </span>
                  </article>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </section>

      <div className="pt-[var(--section-base)]">
        <AgencyClose id="service-close" title="Start with a free review">
          The review looks at your site, your stock feed and your advertising together, and says
          what we would fix first, whether or not that is this service.
        </AgencyClose>
      </div>
    </>
  );
}
