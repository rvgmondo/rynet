import { ArrowRight, ChevronRight, Menu, Search, X } from "lucide-react";
import Link from "next/link";

import { RynetLockup } from "@/components/brand/rynet-mark";
import { HeaderScroll } from "@/components/layout/header-scroll";
import { HeaderSearch } from "@/components/layout/header-search";
import { MenuPopular } from "@/components/layout/menu-popular";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { buttonClasses } from "@/components/ui/button-classes";

/*
 * Only routes that exist. A nav item pointing at a 404 reads as an abandoned site.
 *
 * `match` lists the path prefixes that make an item current: "Buy a car" owns /cars, every facet
 * page under it, and /vehicles, where a single listing lives.
 */
const NAV = [
  { href: "/cars", label: "Buy a car", match: ["/cars", "/vehicles"] },
  { href: "/dealers", label: "Dealerships", match: ["/dealers"] },
  { href: "/how-verification-works", label: "How we verify", match: ["/how-verification-works"] },
] as const;

/*
 * The seller route is /sell-to-a-dealer and nothing else. A private individual cannot list on
 * Rynet: the button offers the car TO dealerships, which is what that page explains, and no
 * route of the "sell-your-car" or "place-an-ad" shape exists (e2e/smoke.spec.ts).
 */
const SELL = { href: "/sell-to-a-dealer", label: "Sell your car" } as const;
const FOR_DEALERS = { href: "/digital", label: "For dealers" } as const;

/**
 * The marketplace header.
 *
 * White, sticky, 64px. The lockup on the left; the three buyer destinations with a current-page
 * state; on the right a compact search (from 1280px, and never on a page that is already a
 * search), then "Sell your car" and "For dealers" as quiet links. There is no red button here:
 * this is a buying site, and red is spent on the one action of each page (Search, Enquire), not
 * on a seller link that shouted over both. Last on the right, the colour theme menu: one icon
 * button, the only theme control on the site.
 *
 * Below 1024px the bar is the lockup, a search button, the theme menu and the menu, three 44px
 * icon buttons side by side with no gap (the icons still sit 24px apart). Below 360px the lockup
 * steps down a size so the three fit beside it. The search button opens the menu with its search
 * field focused (with scripting off it is a link to /cars, which is the search). The menu is a native <details> (works before hydration and without JavaScript) with a
 * small client island that closes it on navigation, on Escape and on a tap on the scrim. It holds
 * the destinations, quick routes by body type, make and price, and one outline "Sell your car".
 * HeaderScroll tucks the bar away while a phone reader scrolls down and brings it back on the way
 * up.
 *
 * The bar is solid, never a backdrop blur: a sticky bar has the page scrolling under it by
 * definition, and a blur there is a full-viewport readback on every frame on a mid-range phone.
 */
export function SiteHeader() {
  return (
    <header className="rn-header">
      <HeaderScroll />
      <div className="container-page rn-header__bar">
        <Link
          href="/"
          aria-label="Rynet, home"
          className="-ml-1 flex shrink-0 items-center rounded-md p-1"
        >
          <RynetLockup className="h-6 w-auto min-[22.5rem]:h-7 lg:h-8" />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} match={item.match} className="rn-navlink">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center lg:gap-2">
          <HeaderSearch className="mr-2 hidden xl:block" />

          <NavLink href={SELL.href} className="rn-navlink hidden lg:inline-flex">
            {SELL.label}
          </NavLink>

          <NavLink
            href={FOR_DEALERS.href}
            match={["/digital"]}
            className="rn-navlink hidden lg:inline-flex"
          >
            {FOR_DEALERS.label}
          </NavLink>

          {/* A link to the search page until the menu island takes it over (see MobileMenu). */}
          <a
            href="/cars"
            data-menu-search=""
            aria-label="Search cars for sale"
            className={buttonClasses({ variant: "ghost", size: "icon", className: "lg:hidden" })}
          >
            <Search aria-hidden="true" className="size-5" />
          </a>

          <ThemeMenu
            buttonClassName={buttonClasses({
              variant: "ghost",
              size: "icon",
              className: "aria-expanded:bg-subtle",
            })}
          />

          <MobileMenu className="lg:hidden">
            <summary
              aria-label="Open menu"
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-heading hover:bg-subtle"
            >
              <Menu aria-hidden="true" className="size-6 group-open:hidden" />
              <X aria-hidden="true" className="hidden size-6 group-open:block" />
            </summary>

            <div className="rn-menu__scrim" data-menu-close="" aria-hidden="true" />

            <div className="rn-menu__sheet">
              <search>
                <form method="get" action="/cars" className="relative p-4 pb-2">
                  <label htmlFor="menu-q" className="sr-only">
                    Search cars for sale
                  </label>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-7.5 mt-1 size-5 -translate-y-1/2 text-muted"
                  />
                  <input
                    id="menu-q"
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder="Search make or model"
                    className="rn-input h-12 bg-subtle pl-11 shadow-none"
                  />
                </form>
              </search>

              {/*
                Labelled "Menu", not "Main". Two navigation landmarks sharing a name are listed
                identically by a screen reader with no way to tell them apart.
              */}
              <nav aria-label="Menu" className="px-2 pb-2">
                <ul>
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <NavLink href={item.href} match={item.match} className="rn-menu__link">
                        {item.label}
                        <ChevronRight aria-hidden="true" />
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <NavLink href={FOR_DEALERS.href} match={["/digital"]} className="rn-menu__link">
                      For dealers: Rynet Digital
                      <ChevronRight aria-hidden="true" />
                    </NavLink>
                  </li>
                </ul>
              </nav>

              <MenuPopular />

              {/* Not offered on the sell page itself, where it would only reload the form. */}
              <div className="rn-menu__sell mt-auto border-t border-line px-4 py-4">
                <Link
                  href={SELL.href}
                  className={buttonClasses({ variant: "outline", size: "lg", block: true })}
                >
                  {SELL.label} to a dealership
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
