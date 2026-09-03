import { ArrowRight, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SERVICES, serviceBySlug } from "@/content/agency/services";
import { serviceJsonLd } from "@/lib/structured-data";

/**
 * One template, seven pages.
 *
 * Seven hand-written page components would drift the first time one of them was edited in a
 * hurry, and the drift always lands on the part nobody rereads, which here is the
 * "where the line is" section. That section is the reason a dealer believes the rest.
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

  const { Icon, name, title, summary, problem, includes, notThis, outcome } = service;
  const others = SERVICES.filter((item) => item.slug !== slug).slice(0, 3);

  return (
    <div className="container-page py-[var(--section-tight)]">
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

      <Breadcrumbs
        trail={[
          { href: "/digital/services", label: "Services" },
          { href: `/digital/services/${slug}`, label: name },
        ]}
      />

      <header className="mt-6">
        <Icon aria-hidden="true" className="size-8 text-accent" />
        <h1 className="measure mt-4 text-4xl leading-[1.15]">{title}</h1>
        <p className="measure mt-5 text-lg text-ink-secondary">{summary}</p>
      </header>

      <section aria-labelledby="problem-heading" className="mt-14">
        <h2 id="problem-heading" className="text-2xl">
          The problem
        </h2>
        <p className="measure mt-4 text-ink-secondary">{problem}</p>
      </section>

      <section aria-labelledby="includes-heading" className="mt-14">
        <h2 id="includes-heading" className="text-2xl">
          What you get
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {includes.map((item) => (
            <li key={item} className="flex gap-3 rounded-lg border border-line p-5">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
              <span className="text-sm text-ink-secondary">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/*
        The section that makes the rest believable. A page listing only what is included
        reads as a brochure; naming what is excluded is the part a dealer principal can
        actually weigh.
      */}
      <section aria-labelledby="not-heading" className="mt-14">
        <h2 id="not-heading" className="text-2xl">
          What this is not
        </h2>
        <ul className="measure mt-6 space-y-3 rounded-lg border-2 border-line-interactive p-6">
          {notThis.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-ink-secondary">
              <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="outcome-heading" className="mt-14">
        <h2 id="outcome-heading" className="text-2xl">
          What you end up with
        </h2>
        <p className="measure mt-4 text-lg text-ink-secondary">{outcome}</p>

        <Link
          href="/digital/contact"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
        >
          Talk to us about {name.toLowerCase()}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>

      <section
        aria-labelledby="others-heading"
        className="mt-[var(--section-base)] border-t border-line pt-10"
      >
        <h2 id="others-heading" className="text-xl">
          Other things we do
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {others.map((other) => (
            <li key={other.slug}>
              <article className="group relative h-full rounded-lg border border-line p-5">
                <other.Icon aria-hidden="true" className="size-5 text-accent" />
                <h3 className="mt-3 text-base leading-snug">
                  <Link
                    href={`/digital/services/${other.slug}`}
                    className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
                  >
                    {other.name}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-ink-secondary">{other.summary}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
