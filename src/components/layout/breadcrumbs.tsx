import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { breadcrumbJsonLd } from "@/lib/structured-data";

export type Crumb = { href: string; label: string };

/**
 * Breadcrumbs.
 *
 * The structured data always carries the whole trail, current page included, because that is what
 * a search result draws its path from.
 *
 * THE VISIBLE TRAIL IS HOME AND THE PARENTS, NOT THE CURRENT PAGE. Every page on this site puts its
 * own name in the headline directly underneath, so the current item only repeated the H1, and on
 * the contact, sell and verification pages the whole "trail" was one item repeating it. A
 * breadcrumb answers "where did this come from"; the headline answers "where am I". So:
 *
 *   - a trail with no parent renders nothing visible (the JSON-LD still ships);
 *   - otherwise it reads Home > parents, with the chevrons hidden from screen readers (on the
 *     agency site "Home" is Rynet Digital);
 *   - `showCurrent` puts the current page back on the end, marked aria-current, for the rare page
 *     whose headline is not its name.
 *
 * Sentence case, 14px, muted links. Each link is at least 24px tall (SC 2.5.8). A long trail
 * scrolls inside its own box rather than pushing a phone sideways.
 */
export function Breadcrumbs({
  trail,
  showCurrent = false,
  className = "",
}: {
  trail: Crumb[];
  showCurrent?: boolean;
  className?: string;
}) {
  if (trail.length === 0) return null;

  // The agency front door has its own home.
  const home = trail[0]?.href.startsWith("/digital")
    ? { href: "/digital", label: "Rynet Digital" }
    : { href: "/", label: "Home" };
  const parents = trail.slice(0, -1).filter((crumb) => crumb.href !== home.href);
  const current = trail[trail.length - 1];
  const hasVisibleTrail = parents.length > 0 || showCurrent;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
      {hasVisibleTrail ? (
        <nav aria-label="Breadcrumb" className={`scroll-x ${className}`}>
          <ol className="rn-crumbs">
            <li>
              <Link href={home.href}>{home.label}</Link>
            </li>
            {parents.map((crumb) => (
              <li key={crumb.href}>
                <ChevronRight aria-hidden="true" />
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ))}
            {showCurrent && current ? (
              <li>
                <ChevronRight aria-hidden="true" />
                <span aria-current="page">{current.label}</span>
              </li>
            ) : null}
          </ol>
        </nav>
      ) : null}
    </>
  );
}
