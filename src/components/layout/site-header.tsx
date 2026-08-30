import { Menu, X } from "lucide-react";
import Link from "next/link";

import { RynetMark } from "@/components/brand/rynet-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/*
 * Only routes that exist. A nav item pointing at a 404 reads as an abandoned site rather
 * than an early one, and there is no version of that which helps.
 *
 * Removed until built: /finance-calculator, /value-my-car, /guides, /sign-in,
 * /dealer-login. Each goes back the moment its page is real.
 */
const NAV = [
  { href: "/cars", label: "Find a car" },
  { href: "/dealers", label: "Dealerships" },
  { href: "/how-verification-works", label: "How we verify" },
] as const;

/**
 * The marketplace header.
 *
 * The first version of this hid the navigation behind `lg:block` with nothing to open it,
 * which left every mobile visitor with no navigation at all, and overflowed the page by
 * 58px at 320px because the sign-in cluster would not fit. Most traffic to a South African
 * car marketplace is mobile, so that was the majority case, not an edge case.
 *
 * The menu is a native `<details>` disclosure. That buys keyboard operation, correct
 * expanded state announcement, and working behaviour before hydration and without
 * JavaScript, none of which a div with an onClick gets for free.
 *
 * `sticky` needs care under WCAG 2.2 SC 2.4.11: a focused element must not end up hidden
 * behind it. The header is 4rem, and `scroll-margin-top` on headings accounts for it.
 *
 * There is no sign-in or dealer login yet, so neither is linked. They return with the
 * accounts and the portal.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Rynet Showroom, home"
        >
          <RynetMark className="h-7 w-auto sm:h-8" />
          <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
            RYNET
          </span>
        </Link>

        {/* Desktop navigation. */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink-secondary transition-colors duration-[var(--duration-micro)] hover:bg-surface-sunken hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/*
            Mobile menu. `details`/`summary` rather than a button plus state, so it opens
            with the keyboard, announces its expanded state, and works before hydration.
            `group` styling swaps the icon on open without any JavaScript at all.
          */}
          <details className="group lg:hidden">
            <summary
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-line-interactive [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <Menu aria-hidden="true" className="size-5 group-open:hidden" />
              <X aria-hidden="true" className="hidden size-5 group-open:block" />
            </summary>

            {/*
              Labelled "Menu", not "Main". Two navigation landmarks sharing a name is an
              accessibility problem in its own right: a screen reader lists both as "Main
              navigation" with no way to tell them apart.
            */}
            <div className="absolute inset-x-0 top-16 border-b border-line bg-surface shadow-(--rn-shadow-3)">
              <nav aria-label="Menu" className="container-page py-2">
                <ul>
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-12 items-center border-b border-line text-base font-medium hover:text-accent"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="text-sm text-ink-secondary">Colour theme</span>
                  <ThemeToggle />
                </div>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
