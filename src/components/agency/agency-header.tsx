import { ArrowLeft, ArrowUpRight, ChevronRight, Mail, Menu, X } from "lucide-react";
import Link from "next/link";

import { AGENCY_EMAIL, AGENCY_NAV, REVIEW_CTA } from "@/components/agency/agency-content";
import { AgencyWordmark } from "@/components/agency/agency-wordmark";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonClasses } from "@/components/ui/button-classes";

/*
 * The focus ring for anything sitting directly on the navy bar. The product ring is a mid blue
 * that disappears on navy, so the bar's own controls use the lighter on-navy blue. The bar is
 * deliberately NOT an `.on-navy` region: the menu sheet opens inside it on a white card, and
 * everything `.on-navy` sets (light ink, light ring, light theme switch) would be wrong there.
 */
const RING = "focus-visible:outline-[color:var(--rn-focus-ring-on-navy)]";

/**
 * The agency header. Navy, sticky, 64px.
 *
 * Deliberately not the marketplace header with different links. Rynet Digital sells to dealer
 * principals and the Rynet marketplace sells to car buyers, so the agency bar is navy where the
 * marketplace bar is white, and a visitor can tell at a glance which front door they are on.
 *
 * Left: RYNET DIGITAL. Then the four agency destinations with a current-page underline in brand
 * red. Right: a quiet way back to the Rynet marketplace (the agency's working example) and the one red
 * action, "Book a free review", which is on every page at every width, phones included.
 *
 * Below 1024px the destinations move into the same native <details> sheet the marketplace uses
 * (works before hydration and without JavaScript; closes on navigation, Escape and a scrim tap).
 * The colour theme switch lives in the footer and at the bottom of that sheet, not in the bar.
 */
export function AgencyHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line-on-navy bg-navy text-on-navy-muted">
      <div className="container-page flex h-[var(--header-height)] items-center gap-2 sm:gap-3">
        <Link
          href="/digital"
          aria-label="Rynet Digital, home"
          className={`-ml-1 flex shrink-0 items-center rounded-sm p-1 ${RING}`}
        >
          <AgencyWordmark />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {AGENCY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className={`rn-navlink text-on-navy-muted hover:bg-navy-raised hover:text-on-navy aria-[current=page]:text-on-navy aria-[current=page]:after:bg-brand-red ${RING}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`rn-navlink hidden gap-1.5 text-on-navy-muted hover:bg-navy-raised hover:text-on-navy lg:inline-flex ${RING}`}
          >
            Rynet marketplace
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>

          <NavLink
            href={REVIEW_CTA.href}
            className={buttonClasses({
              variant: "primary",
              size: "sm",
              className: `px-3 sm:px-4 ${RING}`,
            })}
          >
            <span className="sm:hidden">{REVIEW_CTA.short}</span>
            <span className="hidden sm:inline">{REVIEW_CTA.label}</span>
          </NavLink>

          <MobileMenu className="lg:hidden">
            <summary
              aria-label="Open menu"
              className={`flex size-11 cursor-pointer items-center justify-center rounded-sm text-on-navy hover:bg-navy-raised ${RING}`}
            >
              <Menu aria-hidden="true" className="size-6 group-open:hidden" />
              <X aria-hidden="true" className="hidden size-6 group-open:block" />
            </summary>

            <div className="rn-menu__scrim" data-menu-close="" aria-hidden="true" />

            <div className="rn-menu__sheet">
              {/* "Menu", not "Main": two navigation landmarks with one name cannot be told apart. */}
              <nav aria-label="Menu" className="px-2 pt-3 pb-2">
                <ul>
                  <li>
                    <NavLink href="/digital" match={[]} className="rn-menu__link">
                      Rynet Digital home
                      <ChevronRight aria-hidden="true" />
                    </NavLink>
                  </li>
                  {AGENCY_NAV.map((item) => (
                    <li key={item.href}>
                      <NavLink href={item.href} className="rn-menu__link">
                        {item.label}
                        <ChevronRight aria-hidden="true" />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mx-4 border-t border-line pt-2">
                <Link
                  href="/"
                  className="flex min-h-12 items-center gap-2 rounded-sm px-2 text-[0.9375rem] font-medium text-body hover:bg-subtle hover:text-heading"
                >
                  <ArrowLeft aria-hidden="true" className="size-4 text-muted" />
                  Rynet marketplace, buy a car
                </Link>
              </div>

              <div className="mt-auto border-t border-line px-4 py-4">
                <Link
                  href={REVIEW_CTA.href}
                  className={buttonClasses({ variant: "primary", size: "lg", block: true })}
                >
                  {REVIEW_CTA.label}
                </Link>
                <a
                  href={`mailto:${AGENCY_EMAIL}`}
                  className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-sm text-sm font-medium text-body hover:bg-subtle hover:text-heading"
                >
                  <Mail aria-hidden="true" className="size-4 text-muted" />
                  {AGENCY_EMAIL}
                </a>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-muted">Colour theme</span>
                  <ThemeToggle name="agency-theme-menu" />
                </div>
              </div>
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
