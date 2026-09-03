import Link from "next/link";

import { RynetMark } from "@/components/brand/rynet-mark";
import { SERVICES } from "@/content/agency/services";

/*
 * Only routes that exist. The legal pages are shared with the marketplace deliberately:
 * one company, one privacy notice, one set of terms. Duplicating them so the agency has
 * its own would produce two documents that drift and one of them being wrong.
 */
const RYNET_LINKS = [
  { href: "/digital/contact", label: "Contact" },
  { href: "/", label: "Rynet Showroom" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy and POPIA" },
  { href: "/terms", label: "Terms of use" },
] as const;

export function AgencyFooter() {
  return (
    <footer className="mt-[var(--section-base)] border-t border-line bg-surface-sunken">
      <div className="container-page py-[var(--section-tight)]">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <RynetMark className="h-8 w-auto" />
              <span className="font-display text-lg font-extrabold tracking-tight">
                RYNET <span className="text-accent">DIGITAL</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-ink-secondary">
              We work with car dealerships and nobody else. Websites, stock feeds, advertising,
              search and lead handling, built by the team that built Rynet Showroom.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Pretoria, Gauteng
              <br />
              <a href="mailto:digital@rynet.co.za" className="hover:text-accent">
                digital@rynet.co.za
              </a>
            </p>
          </div>

          <nav aria-labelledby="footer-services">
            <h2
              id="footer-services"
              className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-ink-muted"
            >
              Services
            </h2>
            <ul className="mt-4 space-y-0.5">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/digital/services/${service.slug}`}
                    className="flex min-h-11 items-center text-sm text-ink-secondary transition-colors duration-[var(--duration-micro)] hover:text-accent"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-rynet">
            <h2
              id="footer-rynet"
              className="font-display text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-ink-muted"
            >
              Rynet
            </h2>
            <ul className="mt-4 space-y-0.5">
              {RYNET_LINKS.map((link) => (
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
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Rynet. All rights reserved.</p>
          <p className="measure">
            Rynet Digital and Rynet Showroom are one company. A dealership listing on the
            marketplace is never given preference for being an agency client, and never will be.
          </p>
        </div>
      </div>
    </footer>
  );
}
