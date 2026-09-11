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
      {/*
        The dateline treatment, not a row of underlined sentence-case links with chevrons.
        ---------------------------------------------------------------------------------
        This appears above the headline on nine route shapes and it was the last object in the
        chrome still drawn the old way: default-size links, underlined, separated by lucide
        chevrons, with the CURRENT page set darker than the links leading to it, so the one
        thing on the trail that is not a destination read as the most prominent.

        It is set in the label face now, the trail in muted ink and the current page in ink,
        separated by the same 1px vertical hairline the masthead dateline uses. A slash or a
        chevron between two label-caps items is a third glyph doing work the gap already does.
      */}
      <nav aria-label="Breadcrumb" className="scroll-x">
        <ol className="flex items-center whitespace-nowrap">
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center">
                {index > 0 ? (
                  <span aria-hidden="true" className="mx-3 h-3 w-px bg-line-strong" />
                ) : null}
                {last ? (
                  <span aria-current="page" className="rn-label truncate text-ink">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="rn-label flex min-h-11 items-center text-ink-muted transition-colors duration-[var(--duration-micro)] hover:text-ink"
                  >
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
