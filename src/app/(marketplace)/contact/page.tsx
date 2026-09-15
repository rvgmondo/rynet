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
 * SHOWROOM. The routes are cards grouped by who is asking, with the address as the largest and
 * clearest thing on each card, in normal case, because it is the one thing anybody came for.
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
        email: "hello@rynet.co.za",
        link: { href: "/cars", label: "Browse cars for sale" },
      },
      {
        id: "selling",
        icon: Tag,
        title: "Selling your car",
        body: "Rynet does not list private cars. Describe yours and dealerships in your province that buy that kind of car can contact you with an offer.",
        email: "hello@rynet.co.za",
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
        body: "Run a registered dealership and want your stock on Rynet? Send your trading name, your CIPC registration number, your VAT number if you are registered for VAT, and roughly how many cars you carry.",
        email: "dealers@rynet.co.za",
        link: { href: "/how-verification-works", label: "How we verify dealerships" },
      },
      {
        id: "digital",
        icon: Megaphone,
        title: "Marketing for your dealership",
        body: "Rynet Digital is the marketing side of Rynet: websites, stock feeds, advertising and search for dealerships. Start with a few questions, or email the team.",
        email: "digital@rynet.co.za",
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
        email: "report@rynet.co.za",
      },
      {
        id: "privacy",
        icon: ShieldCheck,
        title: "Privacy and your information",
        body: "Access, correction and deletion requests under POPIA, withdrawing a consent you gave, and anything else about how we handle personal information.",
        email: "privacy@rynet.co.za",
        link: { href: "/privacy", label: "Privacy notice" },
      },
      {
        id: "accessibility",
        icon: Accessibility,
        title: "Something hard to use",
        body: "If part of the site is difficult or impossible to use, tell us the page, what you were trying to do, and what you were using.",
        email: "accessibility@rynet.co.za",
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

      <div className="container-page space-y-14 py-[var(--section-base)]">
        {GROUPS.map((group) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`}>
            <h2 id={`${group.id}-heading`} className="rn-h3">
              {group.title}
            </h2>
            <ul
              className={`mt-5 grid gap-4 ${group.routes.length === 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}
            >
              {group.routes.map((route) => (
                <li key={route.id} id={route.id} className="rn-card flex flex-col p-6">
                  <span aria-hidden="true" className="rn-icon-tile">
                    <route.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{route.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-body">{route.body}</p>

                  <div className="mt-5 border-t border-line pt-4">
                    <a
                      href={`mailto:${route.email}`}
                      className="rn-link inline-flex min-h-11 max-w-full items-center gap-2 break-all text-base"
                    >
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      {route.email}
                    </a>
                    {route.link ? (
                      <div>
                        <Link
                          href={route.link.href}
                          className="rn-link-arrow min-h-11 whitespace-normal"
                        >
                          {route.link.label}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </div>
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
