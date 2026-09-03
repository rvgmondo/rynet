import { ArrowRight, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SERVICES } from "@/content/agency/services";

export const metadata: Metadata = {
  title: "Websites, stock feeds and advertising for car dealerships",
  description:
    "Rynet Digital works with South African car dealerships and nobody else. Websites, stock feeds, paid media, local search, photography, lead routing and reporting.",
  alternates: { canonical: "/digital" },
};

/**
 * The agency home page.
 *
 * The hard problem here is that Rynet Digital has no clients yet, so every convention of an
 * agency home page is unavailable: no logo wall, no testimonials, no case study metrics, no
 * "trusted by 40 dealerships". The brief forbids inventing any of it and it would be the
 * wrong thing to do anyway, since a dealer principal in this market can check.
 *
 * So the proof is Rynet Showroom. It is real, it is on the same domain, and a visitor can
 * open it in a new tab and judge it in ten seconds. "We built the thing you are standing on"
 * is a stronger argument than a testimonial nobody can verify, and it is the only one we
 * have actually earned.
 *
 * Everything claimed below is either about method, or about Showroom, which is checkable.
 * When real dealer work exists, it goes in /digital/work and this page changes.
 */
export default function AgencyHomePage() {
  return (
    <>
      <section className="border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-base)]">
          <p className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-accent">
            Rynet Digital
          </p>
          <h1 className="measure mt-4 text-4xl leading-[1.1] md:text-5xl">
            More test drives. More sales.
          </h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            We work with car dealerships and nobody else. Websites that load on a phone, stock feeds
            that stay correct, advertising you can trace to a lead, and reporting that fits on one
            page.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/digital/contact"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
            >
              Book a call
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/digital/services"
              className="inline-flex min-h-11 items-center rounded-md border-2 border-line-interactive px-6 font-semibold transition-colors duration-[var(--duration-micro)] hover:bg-surface-raised"
            >
              What we do
            </Link>
          </div>
        </div>
      </section>

      {/*
        The proof section. Not a case study, because we have not done client work yet and a
        case study without a client is a lie with a layout. This is the one build we can
        point at, and the visitor can open it and check every claim in it.
      */}
      <section aria-labelledby="proof-heading" className="container-page py-[var(--section-base)]">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 id="proof-heading" className="text-3xl">
              We have not done this for you yet
            </h2>
            <div className="measure mt-5 space-y-4 text-ink-secondary">
              <p>
                Rynet Digital is new, so there is no logo wall on this page and no client
                testimonials, because we do not have any. Putting invented ones here would be the
                easiest thing on this site to do and the fastest way to lose the one dealer who
                checks.
              </p>
              <p>
                What we can show you is what we built for ourselves.{" "}
                <Link href="/" className="font-semibold text-accent hover:underline">
                  Rynet Showroom
                </Link>{" "}
                is on this same domain. Open it, search it on your phone, and judge it. Every claim
                below is something you can verify in the next five minutes.
              </p>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Built for a phone first",
                body: "Tested at 320 pixels through to 1920, on a throttled connection, because that is what your buyers are holding.",
              },
              {
                title: "Accessible, and tested for it",
                body: "WCAG 2.2 AA, with automated checks failing the build on every change rather than an audit at the end.",
              },
              {
                title: "Search that survives a back button",
                body: "Every filter is in the URL, so a search can be sent to someone else or opened again tomorrow.",
              },
              {
                title: "Legible to a search engine",
                body: "Structured data for vehicles and dealerships, canonical URLs, and a crawl policy so filter permutations do not dilute the pages that matter.",
              },
            ].map((item) => (
              <li key={item.title} className="rounded-lg border border-line p-5">
                <h3 className="text-base">{item.title}</h3>
                <p className="mt-2 text-sm text-ink-secondary">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="services-heading"
        className="border-t border-line bg-surface-sunken"
      >
        <div className="container-page py-[var(--section-base)]">
          <h2 id="services-heading" className="text-3xl">
            Seven things, done properly
          </h2>
          <p className="measure mt-4 text-ink-secondary">
            Most dealerships need three or four of these. Nobody needs all seven on day one, and we
            will say so rather than sell you the list.
          </p>

          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ slug, Icon, name, summary }) => (
              <li key={slug}>
                <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition-shadow duration-[var(--duration-element)] hover:shadow-(--rn-shadow-2)">
                  <Icon aria-hidden="true" className="size-6 text-accent" />
                  <h3 className="mt-4 text-lg leading-snug">
                    <Link
                      href={`/digital/services/${slug}`}
                      className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
                    >
                      {name}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-ink-secondary">{summary}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="fit-heading" className="container-page py-[var(--section-base)]">
        <h2 id="fit-heading" className="text-3xl">
          Whether this is a fit
        </h2>
        <p className="measure mt-4 text-ink-secondary">
          Being wrong about this wastes your time and ours, so here it is plainly.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-6">
            <h3 className="flex items-center gap-2 text-lg">
              <Check aria-hidden="true" className="size-5 text-accent" />
              Probably a fit
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              {[
                "You are a registered dealership with stock on a floor and a DMS you can export from.",
                "Your current site is slow, or your stock is wrong on it, or both.",
                "You are spending on Google or Facebook and cannot say what came back.",
                "Leads are arriving in four places and some of them go unanswered.",
                "You want to own what gets built rather than rent it.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border-2 border-line-interactive p-6">
            <h3 className="flex items-center gap-2 text-lg">
              <X aria-hidden="true" className="size-5 text-ink-muted" />
              Probably not
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              {[
                "You sell privately rather than as a registered dealership. We only work with dealerships, same as the marketplace.",
                "You want a guaranteed position in search results. Nobody can promise that honestly.",
                "You want the cheapest option. We are not it, and we will tell you who might be.",
                "You want somebody to post on social media three times a week. That is not what we do.",
                "You need it live next week. The first stock import alone takes longer than that to get right.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="border-t border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="cta-heading" className="text-3xl">
            Start with the free review
          </h2>
          <p className="measure mt-4 text-ink-secondary">
            Send us your website and we will come back with what is actually slowing it down, what
            is stopping it being found, and what we would fix first. No obligation, and we will tell
            you if the answer is that you do not need us.
          </p>
          <Link
            href="/digital/contact"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
          >
            Get in touch
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
