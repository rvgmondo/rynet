import { Accessibility, ArrowRight, BadgeInfo, Check, Link2, Smartphone, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AgencyClose } from "@/components/agency/agency-close";
import { REVIEW_CTA, TERMS } from "@/components/agency/agency-content";
import { ShowroomFrame } from "@/components/agency/showroom-frame";
import { getShowroomSample } from "@/components/agency/showroom-sample";
import { StageSteps } from "@/components/agency/stage-steps";
import { buttonClasses } from "@/components/ui/button-classes";
import { SectionHeader } from "@/components/ui/section-header";
import { SERVICES } from "@/content/agency/services";

export const metadata: Metadata = {
  title: "Websites, stock feeds and advertising for car dealerships",
  description:
    "Rynet Digital works with South African car dealerships and nobody else. Dealership websites, stock feeds, paid media, local search, photography, lead routing and reporting.",
  alternates: { canonical: "/digital" },
};

/*
 * Rendered on demand, because the browser frame shows real Showroom listings from a database
 * that does not exist during `next build`. The listings are cached on the data (see
 * showroom-sample.ts), so this costs one cached read per request.
 */
export const dynamic = "force-dynamic";

/*
 * What Rynet Showroom lets a dealer check for themselves, as outcomes for a dealership rather
 * than as build notes. Each has a place to check it. Search engine markup is deliberately not in
 * the list: structured data is withheld from demonstration listings, so there is nothing on
 * Showroom today that would prove it.
 */
const PROOF = [
  {
    icon: Smartphone,
    title: "Quick on a buyer's phone",
    body: "Built for a mid-range Android on a slow connection, because that is what your buyers are holding, not a laptop on fibre.",
    href: "/cars",
    link: "Search it on your phone",
  },
  {
    icon: Link2,
    title: "A search you can send",
    body: "Every filter lives in the web address, so a buyer can send a search to their partner and it opens exactly the same.",
    href: "/cars?body=suv&maxPrice=300000",
    link: "Open a filtered search",
  },
  {
    icon: Accessibility,
    title: "Usable by every buyer",
    body: "Built to WCAG 2.2 AA and checked automatically on every change, so a buyer using a keyboard or a screen reader can still enquire.",
    href: "/accessibility",
    link: "Read the accessibility statement",
  },
  {
    icon: BadgeInfo,
    title: "Honest about what is not real",
    body: "Every listing on Showroom today is demonstration data, and every card and page says so. Your site gets the same care.",
    href: "/cars",
    link: "See the labels",
  },
] as const;

const FIT = [
  {
    heading: "Probably a fit",
    icon: Check,
    tone: "bg-success-subtle text-success",
    items: [
      "You are a registered dealership with stock on a floor and a DMS you can export from.",
      "Your current site is slow, or your stock is wrong on it, or both.",
      "You are spending on Google or Facebook and cannot say what came back.",
      "Leads arrive in four places and some of them go unanswered.",
      "You want to own what gets built rather than rent it.",
    ],
  },
  {
    heading: "Probably not",
    icon: X,
    tone: "bg-subtle text-muted",
    items: [
      "You sell privately rather than as a registered dealership. We only work with dealerships, same as the marketplace.",
      "You want a guaranteed position in search results. Nobody can promise that honestly.",
      "You want the cheapest option. We are not it, and we will say so.",
      "You want someone to post on social media three times a week. That is not what we do.",
      "You need it live next week. The first stock import alone takes longer than that to get right.",
    ],
  },
] as const;

/**
 * The agency home page.
 *
 * Rynet Digital has no clients yet, so the usual furniture of an agency home page (logo wall,
 * testimonials, case study numbers) is unavailable, and inventing any of it is out of the
 * question. The proof is Rynet Showroom: real, on the same domain, and shown here as itself in a
 * browser frame with live listings, clearly labelled as demonstration data.
 *
 * Order: the outcome and the terms, the working example, the seven services (cards from 640px, a
 * divided list on a phone), the five steps, who it suits and who it does not, then the offer.
 */
export default async function AgencyHomePage() {
  const cards = await getShowroomSample(2);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line-on-navy bg-navy">
        <div className="container-page relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:py-20 xl:gap-20">
          <div className="on-navy">
            <p className="rn-eyebrow text-on-navy-muted">For South African car dealerships</p>
            <h1 className="rn-h1 mt-4">Turn your stock into test drives.</h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed sm:text-lg">
              Dealership websites, stock feeds and advertising, built by the team behind Rynet
              Showroom. We work with car dealerships and nobody else, and you own everything we
              build.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={REVIEW_CTA.href}
                className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
              >
                {REVIEW_CTA.label}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/digital/services"
                className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
              >
                See what we do
              </Link>
            </div>

            <ul className="mt-10 grid gap-3 border-t border-line-on-navy pt-8 text-sm sm:grid-cols-3 sm:gap-6">
              {TERMS.map((term) => (
                <li key={term.title} className="flex gap-3 sm:flex-col sm:gap-2">
                  <term.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-on-navy" />
                  <span className="font-medium text-on-navy">{term.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <ShowroomFrame cards={cards} tone="navy" className="hidden lg:block" />
        </div>
      </section>

      <section aria-labelledby="proof-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="proof-heading"
            eyebrow="The working example"
            title="Judge us on a site you can open right now"
            lead="Rynet Showroom is the marketplace on this domain, and we built it. Everything below is something you can check on it in the next five minutes."
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
            <ShowroomFrame cards={cards} className="lg:hidden" />

            <div className="rounded-lg border border-line bg-subtle p-6 sm:p-8 lg:order-2 lg:self-start">
              <h3 className="rn-h3">We have not done this for you yet</h3>
              <p className="mt-3 text-body">
                Rynet Digital is new, so there are no client logos, testimonials or case studies
                here. Inventing them would be the easiest thing on this site to do, and the fastest
                way to lose the dealer who checks.
              </p>
              <p className="mt-3 text-body">
                What we can show you is what we built for ourselves. When there is client work to
                show, it will be here, with the dealership&apos;s permission and real numbers.
              </p>
              <Link href="/cars" className="rn-link-arrow mt-5">
                Open Rynet Showroom
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <ul className="grid border-t border-line sm:gap-4 sm:border-0 sm:grid-cols-2 lg:order-1">
              {PROOF.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col border-b border-line py-5 sm:rounded-md sm:border sm:p-5"
                >
                  <span className="rn-icon-tile">
                    <item.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-heading">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-body">{item.body}</p>
                  <Link href={item.href} className="rn-link-arrow mt-auto self-start pt-4">
                    {item.link}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="services-heading"
            eyebrow="What we do"
            title="Seven services, built around how a dealership sells"
            action={{ href: "/digital/services", label: "All services" }}
          />

          {/*
            From 640px a grid of cards; on a phone a divided list with the icon inline, because
            seven stacked cards with an icon tile each read as a template, not a menu of services.
          */}
          <ul className="mt-6 grid border-t border-line sm:mt-10 sm:gap-4 sm:border-0 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <li key={service.slug} className="flex">
                <article className="rn-card rn-card--interactive gap-4 p-6 max-sm:flex-row max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:bg-transparent max-sm:px-0 max-sm:py-4 max-sm:shadow-none sm:gap-0">
                  <span className="rn-icon-tile">
                    <service.Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="text-base font-semibold text-heading sm:mt-5 sm:text-lg">
                      <Link
                        href={`/digital/services/${service.slug}`}
                        className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[color:var(--rn-focus-ring)] focus-visible:after:outline-solid"
                      >
                        {service.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-body sm:mt-2">{service.summary}</p>
                    <span aria-hidden="true" className="rn-link-arrow mt-auto pt-5 max-sm:hidden">
                      Learn more
                      <ArrowRight />
                    </span>
                  </div>
                </article>
              </li>
            ))}
            <li className="mt-4 flex sm:mt-0">
              <div className="on-navy flex w-full flex-col rounded-md p-6">
                <h3 className="text-lg font-semibold">Not sure which you need?</h3>
                <p className="mt-2 text-sm">
                  Most dealerships need three or four of these, and nobody needs all seven on day
                  one. The free review tells you where to start.
                </p>
                <Link
                  href={REVIEW_CTA.href}
                  className={buttonClasses({
                    variant: "primary",
                    size: "sm",
                    className: "mt-auto self-start",
                  })}
                >
                  {REVIEW_CTA.label}
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="steps-heading"
            eyebrow="How it works"
            title="Five steps, and the first one is free"
            action={{ href: "/digital/process", label: "How we work" }}
          />

          <div className="mt-10">
            <StageSteps />
          </div>
        </div>
      </section>

      <section aria-labelledby="fit-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="fit-heading"
            eyebrow="Before you book"
            title="Whether we are a fit"
            lead="Being wrong about this wastes your time and ours, so here it is plainly."
          />

          <div className="mt-6 grid gap-2 sm:mt-10 sm:gap-4 lg:grid-cols-2">
            {FIT.map((column) => (
              <div
                key={column.heading}
                className="rn-card p-6 max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 max-sm:bg-transparent max-sm:px-0 max-sm:shadow-none sm:p-8"
              >
                <h3 className="rn-h3">{column.heading}</h3>
                <ul className="mt-5 space-y-4">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3 text-body">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${column.tone}`}
                      >
                        <column.icon className="size-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AgencyClose id="close-heading" title="Start with a free review of your site">
        Send us your website. We come back with what is slowing it down, what is stopping it being
        found, and what we would fix first. If the honest answer is that you do not need us, the
        review says that.
      </AgencyClose>
    </>
  );
}
