import {
  Accessibility,
  ArrowRight,
  BadgeInfo,
  Building2,
  Check,
  ClipboardCheck,
  FileSpreadsheet,
  Link2,
  MapPin,
  Scale,
  Smartphone,
  Sparkles,
  Store,
  Timer,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AgencyClose } from "@/components/agency/agency-close";
import { AgencyPageHead } from "@/components/agency/agency-page-head";
import { buttonClasses } from "@/components/ui/button-classes";
import { SectionHeader } from "@/components/ui/section-header";
import { COMPANY } from "@/content/company";
import { agencyJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About",
  description:
    "Rynet Digital works with South African car dealerships and nobody else. Who we are, why we only take dealerships, what we have built, and how the agency and the marketplace are kept apart.",
  alternates: { canonical: "/digital/about" },
};

/* The short version, beside the headline. Facts about the business, not results. */
const AT_A_GLANCE = [
  {
    icon: Building2,
    label: "Who we work with",
    value: "Registered South African car dealerships, and nobody else",
  },
  { icon: MapPin, label: "Where we are", value: COMPANY.town },
  {
    icon: Store,
    label: "What we have built",
    value: "Rynet Showroom, the marketplace on this domain",
  },
  {
    icon: Sparkles,
    label: "Track record",
    value: "New. No client work to show yet, so we show our own",
  },
] as const;

/* What a general agency has to learn on a dealership's budget, and we do not. */
const ALREADY_KNOWN = [
  {
    icon: FileSpreadsheet,
    title: "Your DMS export",
    body: "What it looks like, why the stock feed breaks, and how the derivative ends up in the model field.",
  },
  {
    icon: Timer,
    title: "Your floor plan",
    body: "What a unit costs you every month it does not move, and why ageing stock goes first in the advertising.",
  },
  {
    icon: Smartphone,
    title: "Your buyers",
    body: "Someone on a phone with a patchy signal, comparing your car with three others on the portals.",
  },
] as const;

/* What a dealer principal can open on Rynet Showroom and check for themselves. */
const BUILT = [
  {
    icon: Link2,
    title: "Search that holds its place",
    body: "Make, body type, price and area, with every filter kept in the web address so a search can be shared.",
  },
  {
    icon: Store,
    title: "A page per dealership",
    body: "Each dealership's stock, where it is and how to reach it, on one page.",
  },
  {
    icon: ClipboardCheck,
    title: "Consent recorded properly",
    body: "Every enquiry stores the exact consent wording the buyer agreed to, with the policy version.",
  },
  {
    icon: Accessibility,
    title: "Usable by every buyer",
    body: "Built to WCAG 2.2 AA, with automated accessibility checks on every change.",
  },
  {
    icon: BadgeInfo,
    title: "Honest labels",
    body: "Every listing on it today is demonstration data, and every card and page says so.",
  },
] as const;

const CONFLICT_RULES = [
  "Search results are ordered by what the buyer asked for, never by who pays us.",
  "Every dealership is checked on the same evidence, whether or not it is an agency client.",
  "There is no paid placement of any kind on Rynet Showroom. If that ever changes, it will be labelled on the page where it happens.",
] as const;

/**
 * About.
 *
 * No team photographs and no headcount, because there is no team to photograph yet and inventing
 * one is out of the question. The page says so instead, which is true and is also the more useful
 * thing for a dealer principal deciding whether to get in touch.
 *
 * The section on the conflict of interest is not optional. Rynet runs a marketplace dealerships
 * list on and an agency that sells to those same dealerships. Every dealer will spot that, and a
 * page that does not address it reads as a page hoping nobody asks. So it gets the navy panel.
 *
 * Order: who we are (with the facts beside the headline), why only dealerships, what we have
 * built, the conflict, who you will deal with, then the offer.
 */
export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agencyJsonLd()) }}
      />

      <AgencyPageHead
        trail={[{ href: "/digital/about", label: "About" }]}
        eyebrow="About Rynet Digital"
        title="A digital team that only works with car dealerships"
        lead="Rynet Digital is the agency half of Rynet. We take on South African dealerships and nobody else, and we built Rynet Showroom, the marketplace this site sits on."
        actions={
          <>
            <Link
              href="/cars"
              className={buttonClasses({ variant: "secondary", size: "lg", block: "mobile" })}
            >
              Open Rynet Showroom
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/digital/services"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              See what we do
            </Link>
          </>
        }
        aside={
          <div className="rn-panel p-6 sm:p-8">
            <h2 className="text-base font-semibold text-heading">At a glance</h2>
            <ul className="mt-5 divide-y divide-line">
              {AT_A_GLANCE.map((fact) => (
                <li key={fact.label} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-subtle text-heading"
                  >
                    <fact.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-muted">{fact.label}</p>
                    <p className="mt-0.5 font-semibold text-heading">{fact.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        }
      />

      <section aria-labelledby="only-heading" className="py-[var(--section-base)]">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">The restriction</p>
            <h2 id="only-heading" className="rn-h2 mt-2">
              Why we only take dealerships
            </h2>
            <p className="rn-lead mt-5">
              A general agency learns your business on your budget. It spends the first two months
              working out what a derivative is, why a unit at ninety days is a problem, and why a
              stock feed that runs a day behind loses you the buyer.
            </p>
            <p className="mt-4 text-body">
              We only take dealerships, so that part is done before we start. It is the whole
              argument for the restriction, and it is why we turn down work outside it.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-heading">
              What we do not have to learn on your time
            </h3>
            <ul className="mt-5 grid gap-4">
              {ALREADY_KNOWN.map((item) => (
                <li key={item.title} className="rn-card flex-row gap-4 p-5 sm:p-6">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-on-secondary"
                  >
                    <item.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-heading">{item.title}</p>
                    <p className="mt-1 text-body">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="built-heading" className="bg-card py-[var(--section-base)]">
        <div className="container-page">
          <SectionHeader
            id="built-heading"
            eyebrow="What we have built"
            title="The working example is Rynet Showroom"
            lead="It is the marketplace on this domain, and you can open it and judge it on your own phone. Here is what to look at."
            action={{ href: "/cars", label: "Open Rynet Showroom" }}
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
            <ul className="grid gap-4 sm:grid-cols-2">
              {BUILT.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-4 rounded-md border border-line bg-page p-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-heading shadow-xs"
                  >
                    <item.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-heading">{item.title}</h3>
                    <p className="mt-1 text-sm text-body">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col rounded-lg border border-line bg-subtle p-6 sm:p-8 lg:self-start">
              <h3 className="rn-h3">No case studies yet, on purpose</h3>
              <p className="mt-3 text-body">
                Rynet Digital is new and has not done client work yet, so a case study would have to
                be invented. We would rather show you something real than describe something that is
                not.
              </p>
              <p className="mt-3 text-body">
                When there is client work, it will be on this site with the dealership&apos;s
                permission and numbers we can stand behind.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="conflict-heading" className="py-[var(--section-base)]">
        <div className="container-page">
          <div className="on-navy relative overflow-hidden rounded-lg px-5 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
              <div>
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-md bg-navy-raised text-on-navy"
                >
                  <Scale className="size-6" />
                </span>
                <p className="rn-eyebrow mt-6 text-on-navy-muted">Said up front</p>
                <h2 id="conflict-heading" className="rn-h2 mt-2">
                  The obvious conflict, and how we handle it
                </h2>
                <p className="mt-5 text-[1.0625rem] leading-relaxed">
                  Rynet runs a marketplace that dealerships list on, and an agency that sells
                  services to dealerships. If agency clients quietly ranked higher on the
                  marketplace, the marketplace would be worthless and the agency would be selling
                  access rather than work. So they do not.
                </p>
              </div>

              <div className="lg:border-l lg:border-line-on-navy lg:ps-16">
                <h3 className="text-base font-semibold">The rules on Rynet Showroom</h3>
                <ul className="mt-5 space-y-4">
                  {CONFLICT_RULES.map((rule) => (
                    <li key={rule} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-raised text-on-navy"
                      >
                        <Check className="size-3.5" />
                      </span>
                      <span className="text-on-navy">{rule}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 border-t border-line-on-navy pt-6 text-sm leading-relaxed">
                  You do not have to take that on trust. Ask us to put it in writing at the contract
                  stage, and we will.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="team-heading" className="pb-[var(--section-base)]">
        <div className="container-page">
          <div className="rn-panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16 lg:p-10">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-subtle text-heading"
              >
                <UserRound className="size-6" />
              </span>
              <div className="min-w-0">
                <h2 id="team-heading" className="rn-h3">
                  Who you will deal with
                </h2>
                <p className="mt-1 text-muted">The person who does the work.</p>
              </div>
            </div>
            <div className="space-y-3 text-body">
              <p>
                Rynet Digital is small and new, so there is no page of headshots here, and a stock
                photograph of people in a meeting room is not an answer to this question.
              </p>
              <p>
                When the team grows, the real names and faces go on this page, along with who looks
                after what.
              </p>
            </div>
          </div>
        </div>
      </section>

      <AgencyClose id="about-close" title="See the work, then tell us about yours">
        Open Rynet Showroom on your phone, then send us your own site. The free review says what we
        would do differently on it, and what we would leave alone.
      </AgencyClose>
    </>
  );
}
