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
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.slug} className="flex min-w-0">
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
 * Makes as a tidy grid of names and live counts, most stocked first. Text only: no manufacturer
 * logos, which are other companies' trade marks. Links go to /cars/[make], a crawlable landing
 * page.
 */
export function MakeGrid({ makes }: { makes: StockOption[] }) {
  const byStock = [...makes].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <ul className="grid grid-cols-2 gap-3 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {byStock.map((make) => (
        <li key={make.slug} className="flex min-w-0">
          <Link
            href={`/cars/${make.slug}`}
            className="rn-card rn-card--interactive min-h-14 flex-row items-center justify-between gap-3 px-4 py-3 shadow-xs hover:shadow-hover"
          >
            <span className="min-w-0 truncate font-semibold text-heading">{make.name}</span>
            <span className="shrink-0 text-sm text-muted tabular">
              {make.count}
              <span className="sr-only"> {make.count === 1 ? "car" : "cars"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A wrapping row of pill links with a count, for provinces. */
export function ChipLinks({
  items,
  href,
}: {
  items: StockOption[];
  href: (slug: string) => string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={href(item.slug)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-medium text-heading transition-colors hover:border-line-control hover:bg-subtle"
          >
            {item.name}
            <span className="text-muted tabular">
              {item.count}
              <span className="sr-only"> {item.count === 1 ? "car" : "cars"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
