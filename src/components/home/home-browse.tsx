import { ArrowRight, CarFront } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { BodyTypeTile, StockOption } from "@/components/home/home-stock";

const cars = (count: number) => (count === 1 ? "1 car" : `${count} cars`);

/**
 * Body types as photo tiles: a photographed listing of each type, the name and a live count.
 *
 * The photograph is decorative inside the link (the name and count are the link text), and it is
 * the 640px "card" rendition, lazy, so the tiles cost the first paint nothing. Links go to the
 * crawlable landing pages under /cars/body/, not to a query string robots.txt disallows.
 */
export function BodyTypeTiles({ tiles }: { tiles: BodyTypeTile[] }) {
  // Three tiles sit three across; on a phone the first spans the row so none is left alone.
  const odd = tiles.length % 2 === 1;
  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:gap-4 ${tiles.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
    >
      {tiles.map((tile, index) => (
        <li
          key={tile.slug}
          className={`flex min-w-0 ${odd && index === 0 ? "col-span-2 lg:col-span-1" : ""}`}
        >
          <Link
            href={`/cars/body/${tile.slug}`}
            className="rn-card rn-card--interactive group overflow-hidden"
          >
            <span className="relative block aspect-[3/2] overflow-hidden bg-subtle">
              {tile.photo ? (
                <Image
                  src={tile.photo.url}
                  alt=""
                  width={tile.photo.width}
                  height={tile.photo.height}
                  sizes="(min-width: 80rem) 19rem, (min-width: 64rem) 25vw, 50vw"
                  className="size-full object-cover object-[50%_55%] motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
                />
              ) : (
                <span className="grid size-full place-items-center text-muted">
                  <CarFront aria-hidden="true" className="size-10" />
                </span>
              )}
            </span>
            <span className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-heading">{tile.name}</span>
                <span className="block text-sm text-muted tabular">{cars(tile.count)}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-accent motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Quick searches: makes and provinces as two compact columns of links with live counts, most
 * stocked first. Text only: no manufacturer logos, which are other companies' trade marks. Links go
 * to the crawlable landing pages under /cars, not to query strings robots.txt disallows.
 *
 * It replaced three separate walls (fifteen make cards, seven province chips and a row of paint
 * names) that turned the lower half of the home page into a directory.
 */
export function PopularSearches({
  makes,
  provinces,
}: {
  makes: StockOption[];
  provinces: StockOption[];
}) {
  const byStock = (list: StockOption[]) =>
    [...list].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <div className="grid gap-8 rounded-lg border border-line bg-card p-5 shadow-xs sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
      {makes.length > 0 ? (
        <div>
          <h3 className="rn-h3">By make</h3>
          <LinkColumns
            items={byStock(makes).slice(0, 12)}
            href={(slug) => `/cars/${slug}`}
            className="mt-3 grid-cols-2 sm:grid-cols-3"
          />
        </div>
      ) : null}
      {provinces.length > 0 ? (
        <div>
          <h3 className="rn-h3">By province</h3>
          <LinkColumns
            items={byStock(provinces)}
            href={(slug) => `/cars/in/${slug}`}
            className="mt-3 grid-cols-2 lg:grid-cols-1"
          />
        </div>
      ) : null}
    </div>
  );
}

function LinkColumns({
  items,
  href,
  className = "",
}: {
  items: StockOption[];
  href: (slug: string) => string;
  className?: string;
}) {
  return (
    <ul className={`grid gap-x-6 ${className}`}>
      {items.map((item) => (
        <li key={item.slug} className="min-w-0 border-b border-line">
          <Link
            href={href(item.slug)}
            className="group flex min-h-11 items-center justify-between gap-3 text-[0.9375rem] font-medium text-heading no-underline hover:text-accent"
          >
            <span className="min-w-0 truncate group-hover:underline group-hover:underline-offset-3">
              {item.name}
            </span>
            <span className="shrink-0 text-sm text-muted tabular">
              {item.count}
              <span className="sr-only"> {item.count === 1 ? "car" : "cars"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
