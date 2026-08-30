import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { breadcrumbJsonLd } from "@/lib/structured-data";

export type Crumb = { href: string; label: string };

/**
 * Breadcrumbs.
 *
 * Visible and marked up, per Section 13. The last item is the current page and is not a
 * link to itself: `aria-current="page"` says where you are, and a link that goes nowhere
 * new is a wasted tab stop.
 *
 * The separators are `aria-hidden`, so a screen reader hears "Cars for sale, Toyota,
 * Hilux" rather than "Cars for sale, chevron, Toyota, chevron, Hilux".
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length === 0) return null;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
      <nav aria-label="Breadcrumb" className="scroll-x">
        <ol className="flex items-center gap-1 whitespace-nowrap text-xs text-ink-muted">
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight aria-hidden="true" className="size-3 shrink-0" /> : null}
                {last ? (
                  <span aria-current="page" className="truncate text-ink-secondary">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-accent">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
