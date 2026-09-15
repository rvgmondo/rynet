import { Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { RynetLockup } from "@/components/brand/rynet-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { COMPANY, companyIdentityLine } from "@/content/company";

/*
 * Only routes that exist. A footer is where people go when the navigation has not helped, so it
 * is the worst place to send them nowhere. Labels are short enough to sit two to a row on a phone.
 */
const COLUMNS = [
  {
    id: "footer-buy",
    heading: "Buy a car",
    links: [
      { href: "/cars", label: "All cars for sale" },
      { href: "/cars/new", label: "New vehicles" },
      // "Ex-demo", the trade's word for a dealer's former demonstrator, so it is never read as a
      // link to the demonstration data the site is seeded with.
      { href: "/cars/demo", label: "Ex-demo vehicles" },
      { href: "/cars/body/bakkie", label: "Bakkies" },
      { href: "/cars/body/suv", label: "SUVs" },
      { href: "/cars/body/hatchback", label: "Hatchbacks" },
    ],
  },
  {
    id: "footer-dealerships",
    heading: "Dealerships",
    links: [
      { href: "/dealers", label: "Find a dealership" },
      { href: "/how-verification-works", label: "How we verify" },
      { href: "/sell-to-a-dealer", label: "Sell to a dealership" },
      { href: "/digital", label: "Rynet Digital" },
    ],
  },
  {
    id: "footer-rynet",
    heading: "Rynet",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/privacy", label: "Privacy and POPIA" },
      { href: "/cookies", label: "Cookies" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
] as const;

/*
 * Quick searches: facet landing pages a buyer is likely to want from any page.
 *
 * A fixed list rather than live counts, because the footer renders on every route, including the
 * ones prerendered at build time where there is no database. Every URL is a real page whatever the
 * stock. Headed "Quick searches", not "Popular searches": nobody has measured what is popular, and
 * the heading would be a claim.
 */
const QUICK_SEARCHES = [
  { href: "/cars/toyota", label: "Toyota" },
  { href: "/cars/volkswagen", label: "Volkswagen" },
  { href: "/cars/ford", label: "Ford" },
  { href: "/cars/suzuki", label: "Suzuki" },
  { href: "/cars/hyundai", label: "Hyundai" },
  { href: "/cars/bmw", label: "BMW" },
  { href: "/cars/body/sedan", label: "Sedans" },
  { href: "/cars/fuel/diesel", label: "Diesel" },
  { href: "/cars/in/gauteng", label: "Gauteng" },
  { href: "/cars/in/western-cape", label: "Western Cape" },
  { href: "/cars/in/kwazulu-natal", label: "KwaZulu-Natal" },
] as const;

/**
 * The marketplace footer. Navy in both themes.
 *
 * The brand line states how the platform works, which is true with or without the seeded
 * demonstration data. It used to promise "no dummy listings" on a site where every listing is a
 * demonstration; that line waits in docs/CONTENT-NEEDED.md for real stock.
 *
 * The company identity line renders only when every part of it is real (src/content/company.ts).
 * The theme switch lives here, out of the header's prime slot.
 */
export function SiteFooter() {
  const identity = companyIdentityLine();

  return (
    <footer className="on-navy border-t border-line-on-navy">
      <div className="container-page pt-12 pb-8 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" aria-label="Rynet, home" className="-ml-1 inline-flex rounded-md p-1">
              <RynetLockup tone="on-navy" className="h-7 w-auto" />
            </Link>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-on-navy-muted">
              A marketplace for cars from South African dealerships. Every dealership is checked
              before it can list, and private sellers cannot list at all.
            </p>
            <ul className="mt-5 space-y-1 text-sm">
              <li className="flex min-h-8 items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {COMPANY.streetAddress ?? COMPANY.town}
              </li>
              <li className="flex min-h-8 items-center gap-2">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <a href="mailto:hello@rynet.co.za" className="rn-footlink min-h-8">
                  hello@rynet.co.za
                </a>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav
                key={column.id}
                aria-labelledby={column.id}
                className={column.id === "footer-rynet" ? "col-span-2 sm:col-span-1" : ""}
              >
                <h2 id={column.id} className="text-sm font-semibold text-on-navy">
                  {column.heading}
                </h2>
                <ul
                  className={`mt-3 ${column.id === "footer-rynet" ? "grid grid-cols-2 gap-x-6 sm:block" : ""}`}
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

        {/* From 768px. On a phone the same destinations are one tap away in the menu search. */}
        <nav
          aria-labelledby="footer-quick"
          className="mt-12 hidden border-t border-line-on-navy pt-8 md:block"
        >
          <h2 id="footer-quick" className="text-sm font-semibold text-on-navy">
            Quick searches
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rn-chip">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 flex flex-col gap-6 border-t border-line-on-navy pt-6 text-xs leading-relaxed text-on-navy-muted md:mt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p>&copy; {new Date().getFullYear()} Rynet. All rights reserved.</p>
            {identity ? <p>{identity}</p> : null}
            <p className="max-w-xl">
              Vehicle prices and specifications are supplied by the selling dealership. Finance
              figures shown anywhere on this site are estimates, not quotations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">Theme</span>
            <ThemeToggle name="theme-footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
