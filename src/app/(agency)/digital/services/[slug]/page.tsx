import { ArrowRight } from "lucide-react";
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

  const { name, title, summary, problem, includes, notThis, outcome } = service;
  const others = SERVICES.filter((item) => item.slug !== slug).slice(0, 3);

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

      {/*
        REDRAWN, and it is seven pages wide rather than one.
        ---------------------------------------------------
        This template contained no part of the design system at all: no rn-head, no rn-prose, no
        rn-label, no rule, no ground change. So the services index one level up was rebuilt as a
        numbered ruled index last week, and a visitor who clicked a row on it arrived at a page
        belonging to a different site: six bordered boxes for "what you get", a heavy 2px box at
        half the column width for "what this is not", and three bordered icon cards at the end.
      */}
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs
            trail={[
              { href: "/digital/services", label: "Services" },
              { href: `/digital/services/${slug}`, label: name },
            ]}
          />

          <p className="rn-label mt-8 text-ink-muted">{name}</p>
          <h1 className="rn-head mt-4 max-w-[16ch]">{title}</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">{summary}</p>
        </div>
      </section>

      {/*
        The problem and what you get, side by side against one rule.
        The claim holds the left, the detail holds the right, which is the spread the
        marketplace uses for its verification copy and the agency uses on /digital/about.
      */}
      <section
        aria-labelledby="problem-heading"
        className="container-page py-[var(--section-base)]"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="problem-heading" className="rn-head max-w-[10ch]">
            The problem
          </h2>
          <p className="rn-prose rn-prose--drop text-ink-secondary">{problem}</p>
        </div>

        <hr className="rn-rule mt-[var(--section-base)]" />

        <div className="mt-[var(--section-base)] grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 id="includes-heading" className="rn-head max-w-[10ch]">
            What you get
          </h2>
          {/* A ruled list. It was six bordered boxes in a two-column grid, each with a green
              tick in the corner, which is the object the redesign exists to remove and the
              colour this palette does not otherwise use. */}
          <ul className="border-t border-line">
            {includes.map((item) => (
              <li key={item} className="border-b border-line py-4 text-ink-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/*
        The section that makes the rest believable, on the ground that says so.
        ----------------------------------------------------------------------
        A page listing only what is included reads as a brochure; naming what is excluded is the
        part a dealer principal can actually weigh. It was a heavy bordered box at half the
        column width with the rest of the row empty, which is where a business puts something it
        would rather not draw attention to. Every other page on this site gives its most
        confident claim the inverted ground, and this is that claim.
      */}
      <section aria-labelledby="not-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="not-heading" className="rn-head max-w-[12ch]">
            What this is not
          </h2>
          <hr className="mt-8 h-px border-0 bg-silver" />

          <ul className="mt-10 grid gap-x-16 md:grid-cols-2">
            {notThis.map((item) => (
              <li key={item} className="border-t border-silver/40 py-5 opacity-90">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="outcome-heading"
        className="container-page py-[var(--section-base)]"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-16">
          <h2 id="outcome-heading" className="rn-head max-w-[12ch]">
            What you end up with
          </h2>
          <div>
            <p className="rn-prose rn-prose--drop text-lg text-ink-secondary">{outcome}</p>
            <Link
              href="/digital/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
            >
              Talk to us about {name.toLowerCase()}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/*
        The other three, drawn the way the index one level up draws all seven. A visitor moving
        sideways should meet the same object, not three bordered cards that flip two words red.
      */}
      <section aria-labelledby="others-heading" className="container-page pb-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <h2 id="others-heading" className="rn-label mt-8 text-ink-muted">
          Other things we do
        </h2>

        <ul className="mt-4 border-t border-line">
          {others.map((other) => (
            <li key={other.slug} className="border-b border-line">
              <Link
                href={`/digital/services/${other.slug}`}
                className="group grid gap-2 py-6 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse sm:grid-cols-[18rem_1fr_2rem] sm:items-baseline sm:gap-8 sm:px-4"
              >
                <span className="font-display text-lg font-bold leading-snug">{other.name}</span>
                <span className="text-sm text-ink-secondary group-hover:text-ink-inverse">
                  {other.summary}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-4 shrink-0 self-center sm:block"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
