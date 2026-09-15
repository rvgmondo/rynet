"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A navigation link that knows whether it is where you are.
 *
 * Neither header ever said which section a visitor was in: on /cars "Find a car" was the same
 * muted grey as the three items beside it, and `aria-current` appeared nowhere on the site but
 * the breadcrumb and the pagination. That is disorienting for everyone and a screen reader user
 * had no way to tell at all.
 *
 * `match` lists the path prefixes that count, because a section is more than one route. "Find a
 * car" owns /cars and every facet page under it, and also /vehicles, which is where a single
 * listing lives; matching only its own href left it dark on the page a buyer spends longest on.
 *
 * A client island only because the header is a server component in a persistent layout and has
 * no idea what the path is. It is a few hundred bytes and paints nothing the server did not.
 */
export function NavLink({
  href,
  match,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  children,
}: {
  href: string;
  /** Path prefixes that make this the current section. Defaults to the href itself. */
  match?: readonly string[];
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const prefixes = match ?? [href];
  const active = prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}
