import {
  Accessibility,
  ArrowRight,
  Building2,
  Car,
  Flag,
  type LucideIcon,
  Mail,
  MapPin,
  Megaphone,
  ShieldCheck,
  Tag,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { IconTile } from "@/components/ui/icon-tile";
import { PageHeader } from "@/components/ui/page-header";
import { COMPANY } from "@/content/company";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach Rynet, whether you are buying, selling, running a dealership, or asking about your information.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact.
 *
 * Routed addresses rather than one catch-all, because the reasons people write are handled by
 * different people, and an "info@" is read by nobody in particular. Every address here is one
 * the code already uses elsewhere; none was invented for this page, and there is no phone number
 * or set of hours because none has been supplied (see src/content/company.ts).
 *
 * No general contact form. The enquiry form on a listing exists because it attaches to a
 * vehicle and a dealership; a general one would be a second surface to rate-limit, spam-check
 * and monitor, for no gain over an email address.
 *
 * SHOWROOM. The routes are a routing table grouped by who is asking: one panel per group, a ruled
 * row per route, and the address in the same column on every row, because it is the one thing
 * anybody came for.
 */

type Route = {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  email: string;
  link?: { href: string; label: string };
};

const GROUPS: { id: string; title: string; routes: Route[] }[] = [
  {
    id: "buying-and-selling",
    title: "Buying or selling a car",
    routes: [
      {
        id: "buying",
        icon: Car,
        title: "Buying a car",
        body: "Questions about a specific car go to the dealership selling it, through the enquiry button on the listing: they have the car and the paperwork. For anything about Rynet itself, email us.",
        email: "info@rynet.co.za",
        link: { href: "/cars", label: "Browse cars for sale" },
      },
      {
        id: "selling",
        icon: Tag,
        title: "Selling your car",
        body: "Rynet does not list private cars. Describe yours and dealerships in your province that buy that kind of car can contact you with an offer.",
        email: "info@rynet.co.za",
        link: { href: "/sell-to-a-dealer", label: "Sell to a dealership" },
      },
    ],
  },
  {
    id: "dealerships",
    title: "For dealerships",
    routes: [
      {
        id: "listing",
        icon: Building2,
        title: "Listing your dealership",
        body: "Run a registered dealership and want your stock on Rynet? Sign up in under a minute and we load every car ourselves from your website. If some cars are only on a spreadsheet, send that and we do the rest. Free while we launch.",
        email: "sales@rynet.co.za",
        link: { href: "/list-your-stock", label: "List your stock" },
      },
      {
        id: "digital",
        icon: Megaphone,
        title: "Marketing for your dealership",
        body: "Rynet Digital is the marketing side of Rynet: websites, stock feeds, advertising and search for dealerships. Start with a few questions, or email the team.",
        email: "sales@rynet.co.za",
        link: { href: "/digital", label: "Visit Rynet Digital" },
      },
    ],
  },
  {
    id: "information-and-the-site",
    title: "Reports, privacy and the site",
    routes: [
      {
        id: "report",
        icon: Flag,
        title: "Reporting a listing or a dealership",
        body: "If a listing is wrong, or a dealership did not turn out to be what its listing suggested, tell us which one and what happened.",
        email: "info@rynet.co.za",
      },
      {
        id: "privacy",
        icon: ShieldCheck,
        title: "Privacy and your information",
        body: "Access, correction and deletion requests under POPIA, withdrawing a consent you gave, and anything else about how we handle personal information.",
        email: "info@rynet.co.za",
        link: { href: "/privacy", label: "Privacy notice" },
      },
      {
        id: "accessibility",
        icon: Accessibility,
        title: "Something hard to use",
        body: "If part of the site is difficult or impossible to use, tell us the page, what you were trying to do, and what you were using.",
        email: "info@rynet.co.za",
        link: { href: "/accessibility", label: "Accessibility statement" },
      },
    ],
  },
];

export default function ContactPage() {
  const identity = [
    COMPANY.legalName,
    COMPANY.registrationNumber ? `Registration number ${COMPANY.registrationNumber}` : null,
    COMPANY.vatNumber ? `VAT number ${COMPANY.vatNumber}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <>
      <Breadcrumbs trail={[{ href: "/contact", label: "Contact" }]} />

      <PageHeader
        id="contact-heading"
        eyebrow="Contact"
        title="How can we help?"
        lead="Pick the route that fits and your message goes straight to the person who deals with it."
        actions={
          <nav aria-label="Contact routes">
            <ul className="flex flex-wrap gap-2">
              {GROUPS.map((group) => (
                <li key={group.id}>
                  <a href={`#${group.id}`} className="rn-chip min-h-11">
                    {group.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        }
      />

      <div className="container-page space-y-10 py-[var(--section-base)] lg:space-y-14">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className="grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-12"
          >
            <h2 id={`${group.id}-heading`} className="rn-h3 lg:pt-7">
              {group.title}
            </h2>
            {/*
              A routing table rather than a wall of cards: one panel per group, a ruled row per
              route. From 1024px each row reads across, who it is for, what to send, and the
              address, so the address sits in the same place on every row.
            */}
            <ul className="rn-panel divide-y divide-line">
              {group.routes.map((route) => (
                <li
                  key={route.id}
                  id={route.id}
                  className="grid scroll-mt-24 gap-3 p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,16rem)] lg:items-start lg:gap-8 lg:px-7"
                >
                  <div className="flex items-center gap-4">
                    <IconTile icon={route.icon} />
                    <h3 className="text-lg leading-snug font-semibold">{route.title}</h3>
                  </div>
                  <p className="text-body lg:pt-2.5 lg:text-[0.9375rem]">{route.body}</p>
                  <div className="flex flex-col items-start lg:pt-1">
                    <a
                      href={`mailto:${route.email}`}
                      className="rn-link inline-flex min-h-11 max-w-full items-center gap-2 break-all text-base"
                    >
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      {route.email}
                    </a>
                    {route.link ? (
                      <Link
                        href={route.link.href}
                        className="rn-link-arrow min-h-11 text-sm whitespace-normal"
                      >
                        {route.link.label}
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/*
          The company's own details, and only the ones that are real.

          A verification platform should show what it asks of a dealership: registered name,
          registration number, a street address, a phone number. None of those has been supplied
          yet and none will be invented, so each line appears the day its value is set in
          src/content/company.ts. Until then this says the one thing that is true, the town.
        */}
        <section aria-labelledby="company-heading" className="rn-panel p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
            <div>
              <h2 id="company-heading" className="rn-h3">
                {identity.length > 0 ? "Company details" : "Where we are"}
              </h2>
              <address className="mt-4 space-y-2 not-italic text-body">
                {identity.map((line, index) => (
                  <span
                    key={line}
                    className={`block ${index === 0 ? "font-semibold text-heading" : "text-sm"}`}
                  >
                    {line}
                  </span>
                ))}
                <span className="flex items-start gap-2">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
                  {COMPANY.streetAddress ?? `${COMPANY.town}, South Africa`}
                </span>
                {COMPANY.phone ? (
                  <a
                    href={`tel:${COMPANY.phone.replace(/[^0-9+]/g, "")}`}
                    className="rn-link inline-flex min-h-11 items-center tabular"
                  >
                    {COMPANY.phone}
                  </a>
                ) : null}
                {COMPANY.officeHours ? (
                  <span className="block text-sm text-muted">{COMPANY.officeHours}</span>
                ) : null}
              </address>
            </div>

            <div className="border-t border-line pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-12">
              <h3 className="text-base font-semibold">Before you write</h3>
              <ul className="mt-3 space-y-1">
                {[
                  {
                    href: "/sell-to-a-dealer#faq-heading",
                    label: "Questions about selling your car",
                  },
                  { href: "/how-verification-works", label: "What verification covers" },
                  { href: "/privacy", label: "What we do with your information" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="rn-link-arrow min-h-11 whitespace-normal">
                      {item.label}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
