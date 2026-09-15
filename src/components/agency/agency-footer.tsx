import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { AGENCY_EMAIL, AGENCY_NAV, REVIEW_CTA } from "@/components/agency/agency-content";
import { AgencyWordmark } from "@/components/agency/agency-wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SERVICES } from "@/content/agency/services";
import { COMPANY, companyIdentityLine } from "@/content/company";

/*
 * Only routes that exist. The legal pages are shared with the marketplace on purpose: one
 * company, one privacy notice, one set of terms. Two copies would drift and one would be wrong.
 */
const COLUMNS = [
  {
    id: "agency-footer-services",
    heading: "Services",
    links: SERVICES.map((service) => ({
      href: `/digital/services/${service.slug}`,
      label: service.name,
    })),
  },
  {
    id: "agency-footer-digital",
    heading: "Rynet Digital",
    links: [...AGENCY_NAV, { href: REVIEW_CTA.href, label: REVIEW_CTA.label }],
  },
  {
    id: "agency-footer-rynet",
    heading: "Rynet",
    links: [
      { href: "/", label: "Rynet marketplace" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/privacy", label: "Privacy and POPIA" },
      { href: "/cookies", label: "Cookies" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
] as const;

/**
 * The agency footer. Navy in both themes, like the header, so the agency reads as one piece.
 *
 * The descriptor is its own line, not the home page headline again. Contact details are only
 * what is real: the town from src/content/company.ts, the agency mailbox, and a phone number
 * only once the company has one (it is null today and renders nothing). The company identity
 * line appears only when every part of it is real. The colour theme switch lives here.
 *
 * No top margin: every agency page ends in a section that carries its own bottom padding, and a
 * margin here stacked on top of it left a dead band above the footer.
 */
export function AgencyFooter() {
  const identity = companyIdentityLine();

  return (
    <footer className="on-navy">
      <div className="container-page pt-12 pb-8 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Link
              href="/digital"
              aria-label="Rynet Digital, home"
              className="-ml-1 inline-flex rounded-sm p-1"
            >
              <AgencyWordmark size="footer" />
            </Link>
            <p className="mt-5 text-[0.9375rem] leading-relaxed">
              Websites, stock feeds and advertising for South African car dealerships, from the team
              that built the Rynet marketplace.
            </p>
            <ul className="mt-5 space-y-1 text-sm">
              <li className="flex min-h-8 items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {COMPANY.streetAddress ?? COMPANY.town}
              </li>
              <li className="flex min-h-8 items-center gap-2">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <a href={`mailto:${AGENCY_EMAIL}`} className="rn-footlink min-h-8">
                  {AGENCY_EMAIL}
                </a>
              </li>
              {COMPANY.phone ? (
                <li className="flex min-h-8 items-center gap-2">
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  <a
                    href={`tel:${COMPANY.phone.replace(/[^0-9+]/g, "")}`}
                    className="rn-footlink min-h-8"
                  >
                    {COMPANY.phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav
                key={column.id}
                aria-labelledby={column.id}
                className={column.id === "agency-footer-services" ? "col-span-2 sm:col-span-1" : ""}
              >
                <h2 id={column.id} className="text-sm font-semibold">
                  {column.heading}
                </h2>
                <ul
                  className={`mt-3 ${column.id === "agency-footer-services" ? "grid grid-cols-2 gap-x-6 sm:block" : ""}`}
                >
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="rn-footlink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-line-on-navy pt-6 text-xs leading-relaxed md:mt-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p>&copy; {new Date().getFullYear()} Rynet. All rights reserved.</p>
            {identity ? <p>{identity}</p> : null}
            <p className="max-w-xl">
              Rynet Digital and the Rynet marketplace are one company. Being an agency client never
              buys a dealership a better position on the marketplace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">Theme</span>
            <ThemeToggle name="agency-theme-footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
