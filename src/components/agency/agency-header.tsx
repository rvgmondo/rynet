import { ArrowLeft, Menu, X } from "lucide-react";
import Link from "next/link";

import { RynetMark } from "@/components/brand/rynet-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/*
 * Only routes that exist, same rule as the marketplace header.
 *
 * Not linked until built: /digital/work (there are no case studies, and inventing one is
 * out of the question), /digital/insights, /digital/resources, /digital/careers,
 * /digital/book.
 */
const NAV = [
  { href: "/digital/services", label: "Services" },
  { href: "/digital/process", label: "How we work" },
  { href: "/digital/pricing", label: "Pricing" },
  { href: "/digital/about", label: "About" },
] as const;

/**
 * The agency header.
 *
 * Deliberately not the marketplace header with different links. Rynet Digital sells to
 * dealer principals and Rynet Showroom sells to car buyers, and a visitor who cannot tell
 * which one they are on will assume the agency is a department of the classifieds site.
 * The wordmark carries "Digital", and there is an explicit way back to the marketplace,
 * because the two share a domain and somebody will arrive on the wrong one.
 *
 * Same `<details>` disclosure as the marketplace: keyboard operable, announces its expanded
 * state, and works before hydration and with JavaScript off.
 */
export function AgencyHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Link
          href="/digital"
          className="flex shrink-0 items-center gap-2"
          aria-label="Rynet Digital, home"
        >
          <RynetMark className="h-7 w-auto sm:h-8" />
          <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
            RYNET <span className="text-accent">DIGITAL</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rn-label flex min-h-11 items-center px-3 text-ink-muted transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
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

          <Link
            href="/digital/contact"
            /*
              Ruled, not filled. The hero carries the one red call to action on this page,
              and a second red block in the masthead directly above it spends the colour
              twice on the same request.
            */
            className="rn-label hidden min-h-11 items-center border border-line-interactive px-4 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse sm:inline-flex"
          >
            Book a call
          </Link>

          <details className="group lg:hidden">
            <summary
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center border border-line-interactive text-ink-secondary hover:bg-ink hover:text-ink-inverse [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <Menu aria-hidden="true" className="size-5 group-open:hidden" />
              <X aria-hidden="true" className="hidden size-5 group-open:block" />
            </summary>

            <nav
              aria-label="Main"
              className="absolute inset-x-0 top-16 border-b border-line bg-surface p-4 shadow-(--rn-shadow-2)"
            >
              <ul className="container-page flex flex-col gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center border-b border-line px-3 font-medium text-ink-secondary hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/digital/contact"
                    className="rn-label mt-2 flex min-h-11 items-center justify-center bg-accent-solid px-4 text-ink-on-accent hover:bg-accent-solid-hover"
                  >
                    Book a call
                  </Link>
                </li>
                <li className="mt-2 border-t border-line pt-2">
                  <Link
                    href="/"
                    className="flex min-h-11 items-center gap-2 px-3 text-sm text-ink-secondary hover:text-accent"
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Rynet Showroom, buy a car
                  </Link>
                </li>
                <li className="pt-2">
                  <ThemeToggle />
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
