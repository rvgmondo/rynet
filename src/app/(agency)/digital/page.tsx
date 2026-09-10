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
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-base)]">
          {/* Muted, not red. The one filled red object above this fold is the call to
              action; a red eyebrow above it competes with the thing it is meant to point at. */}
          <p className="rn-label text-ink-muted">Rynet Digital</p>
          {/*
            `rn-head`, not `text-5xl`.
            ------------------------
            This whole page was set at Tailwind's default scale in the default width while
            the marketplace was rebuilt around a display face with a real width axis. The
            headline said the same words at two thirds the presence, and a visitor crossing
            from one front door to the other could see that one of them had been designed and
            the other had been laid out.
          */}
          <h1 className="rn-head mt-5 max-w-[18ch]">More test drives. More sales.</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            We work with car dealerships and nobody else. Websites that load on a phone, stock feeds
            that stay correct, advertising you can trace to a lead, and reporting that fits on one
            page.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/digital/contact"
              className="rn-label inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
            >
              Book a call
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/digital/services"
              className="rn-label inline-flex min-h-12 items-center border border-line-interactive px-6 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
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
            <h2 id="proof-heading" className="rn-head">
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
              <li key={item.title} className="border-t-2 border-ink pt-5">
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
          <h2 id="services-heading" className="rn-head">
            Seven things, done properly
          </h2>
          <p className="measure mt-4 text-ink-secondary">
            Most dealerships need three or four of these. Nobody needs all seven on day one, and we
            will say so rather than sell you the list.
          </p>

          {/*
            An index, not a card grid.
            -------------------------
            Seven bordered boxes with a small red icon in the corner of each is the layout
            every agency site in the country already has, and it is what made this page read
            as a template next to the marketplace. It also fought the design system, which
            spent the whole redesign taking boxes off things.

            So the seven become a numbered list, which is what they actually are. The number
            is set at display scale in the muted ink so the row has a spine, the name carries
            the weight, and the rule between rows does the work the border was doing. It
            reads as a contents page, which is a form that suits seven items and suits a firm
            that wants to look like it has done this before.
          */}
          <ol className="mt-10 border-t border-line">
            {SERVICES.map(({ slug, name, summary }, index) => (
              <li key={slug} className="border-b border-line">
                <Link
                  href={`/digital/services/${slug}`}
                  className="group flex flex-col gap-2 py-6 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse sm:flex-row sm:items-baseline sm:gap-8 sm:px-4"
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-2xl font-extrabold tabular text-ink-muted group-hover:text-ink-inverse [font-variation-settings:'wdth'_112]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-8">
                    <span className="font-display text-xl font-bold leading-snug sm:w-[20rem] sm:shrink-0">
                      {name}
                    </span>
                    <span className="mt-2 block text-sm text-ink-secondary group-hover:text-ink-inverse sm:mt-0">
                      {summary}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden size-4 shrink-0 self-center sm:block"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
        The tonal break this page did not have.
        --------------------------------------
        Every band on this page sat on the same two grounds in the same left-aligned column,
        so it read as one long scroll with headings in it. The marketplace breaks its own
        rhythm exactly once, by inverting the ground under "What verified means", and the
        break is most of what makes that page feel composed rather than stacked.

        This is the right band to do it to. Saying plainly who should not hire us is the most
        confident thing on the page, so it gets the ground that looks like a statement.

        Two columns split by a rule rather than two bordered boxes. A box around a list is a
        container drawn because the layout felt loose, and the rule between the columns is
        the same information with nothing extra around it.
      */}
      <section aria-labelledby="fit-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="fit-heading" className="rn-head">
            Whether this is a fit
          </h2>
          <p className="measure mt-4 text-lg opacity-80">
            Being wrong about this wastes your time and ours, so here it is plainly.
          </p>
          <hr className="mt-8 h-px border-0 bg-silver" />

          <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-silver">
            {[
              {
                heading: "Probably a fit",
                Mark: Check,
                items: [
                  "You are a registered dealership with stock on a floor and a DMS you can export from.",
                  "Your current site is slow, or your stock is wrong on it, or both.",
                  "You are spending on Google or Facebook and cannot say what came back.",
                  "Leads are arriving in four places and some of them go unanswered.",
                  "You want to own what gets built rather than rent it.",
                ],
              },
              {
                heading: "Probably not",
                Mark: X,
                items: [
                  "You sell privately rather than as a registered dealership. We only work with dealerships, same as the marketplace.",
                  "You want a guaranteed position in search results. Nobody can promise that honestly.",
                  "You want the cheapest option. We are not it, and we will tell you who might be.",
                  "You want somebody to post on social media three times a week. That is not what we do.",
                  "You need it live next week. The first stock import alone takes longer than that to get right.",
                ],
              },
            ].map((column, index) => (
              <div key={column.heading} className={index === 0 ? "md:pe-10" : "md:ps-10"}>
                <h3 className="rn-label">{column.heading}</h3>
                <ul className="mt-6 space-y-0">
                  {column.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-4 border-t border-silver/40 py-4 text-sm opacity-90"
                    >
                      <column.Mark aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        The close, at closing scale.
        ---------------------------
        It was a third-level heading, a paragraph and a small button, which is how a page
        ends when nobody decided how it should end. The offer is the single most valuable
        thing on this page and it was the quietest object on it.

        The rule above it is the masthead sweep, which appears twice on this site and both
        times to say that something is over.
      */}
      <section aria-labelledby="cta-heading" className="container-page py-[var(--section-base)]">
        <hr className="rn-rule rn-rule--brand" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <h2 id="cta-heading" className="rn-head max-w-[14ch]">
              Start with the free review
            </h2>
          </div>
          <div>
            <p className="rn-prose text-ink-secondary">
              Send us your website and we will come back with what is actually slowing it down, what
              is stopping it being found, and what we would fix first. No obligation, and we will
              tell you if the answer is that you do not need us.
            </p>
            <Link
              href="/digital/contact"
              className="rn-label mt-8 inline-flex min-h-12 items-center gap-2 bg-accent-solid px-6 text-ink-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-solid-hover"
            >
              Get in touch
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
