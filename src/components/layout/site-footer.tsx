import Link from "next/link";

import { RynetMark } from "@/components/brand/rynet-mark";

const COLUMNS = [
  {
    heading: "Buy a car",
    links: [
      { href: "/cars", label: "All stock" },
      { href: "/cars/new", label: "New vehicles" },
      { href: "/cars/demo", label: "Demo models" },
      { href: "/cars/body/bakkie", label: "Bakkies" },
      { href: "/cars/body/suv", label: "SUVs" },
      { href: "/finance-calculator", label: "Finance calculator" },
    ],
  },
  {
    heading: "Dealerships",
    links: [
      { href: "/dealers", label: "Find a dealership" },
      { href: "/how-verification-works", label: "How verification works" },
      { href: "/dealer-login", label: "Dealer login" },
      { href: "/digital", label: "Rynet Digital, for dealers" },
    ],
  },
  {
    heading: "Advice",
    links: [
      { href: "/guides", label: "Buying guides" },
      { href: "/reviews", label: "Reviews" },
      { href: "/news", label: "News" },
      { href: "/value-my-car", label: "What is my car worth" },
    ],
  },
  {
    heading: "Rynet",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/privacy", label: "Privacy and POPIA" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-[var(--section-base)] border-t border-line bg-surface-sunken">
      <div className="container-page py-[var(--section-tight)]">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <RynetMark className="h-8 w-auto" />
              <span className="font-display text-lg font-extrabold tracking-tight">RYNET</span>
            </div>
            <p className="mt-4 text-sm text-ink-secondary">
              Every car on Rynet comes from a registered dealership we have checked. No private
              sellers, no dummy listings, no wondering who you are actually talking to.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Pretoria, Gauteng
              <br />
              <a href="mailto:hello@rynet.co.za" className="hover:text-accent">
                hello@rynet.co.za
              </a>
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
              <h2
                id={`footer-${column.heading}`}
                className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-ink-muted"
              >
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-0.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-11 items-center text-sm text-ink-secondary transition-colors duration-[var(--duration-micro)] hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Rynet. All rights reserved.</p>
          <p className="measure">
            Vehicle prices and specifications are supplied by the selling dealership. Finance
            figures shown anywhere on this site are estimates, not quotations.
          </p>
        </div>
      </div>
    </footer>
  );
}
