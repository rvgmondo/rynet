import Link from "next/link";

import type { ColourTile } from "@/lib/home-data";

/** A swatch only ever takes a hex colour from the database, nothing that could carry other CSS. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Browse by colour, as a small row of pill links.
 *
 * It used to be a full-bleed wall of 240px colour fields drawn by the plate engine, which greyed
 * every white and muddied the reds so the labels stayed legible. Here each pill shows the
 * manufacturer's own swatch at its true value in a 20px dot with a 3:1 ring, so a white reads as
 * white on a white card and a black reads as black on the dark theme, beside the name and a live
 * count. The most stocked colours come first and the row stops at `limit`.
 */
export function ColourWall({
  colours,
  limit = 12,
  className = "",
}: {
  colours: ColourTile[];
  limit?: number;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {colours.slice(0, limit).map((colour) => (
        <li key={colour.slug}>
          <Link
            href={`/cars?colour=${colour.slug}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-card ps-2.5 pe-4 text-sm font-medium text-heading transition-colors hover:border-line-control hover:bg-subtle"
          >
            <span
              aria-hidden="true"
              className="size-5 shrink-0 rounded-full bg-subtle ring-1 ring-line-control ring-inset"
              style={
                colour.swatch && HEX.test(colour.swatch)
                  ? { backgroundColor: colour.swatch }
                  : undefined
              }
            />
            {colour.name}
            <span className="text-muted tabular">
              {colour.count}
              <span className="sr-only"> {colour.count === 1 ? "car" : "cars"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
