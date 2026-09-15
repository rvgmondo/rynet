import { ArrowRight, CarFront } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { BodyTypeTile, BudgetBand, MakeTile, StockOption } from "@/components/home/home-stock";

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

type BrowseTab = "body" | "make" | "budget" | "province";

/*
 * The four ways in. The show and hide classes are written out in full (not built from the id) so
 * Tailwind can find every one of them.
 */
const TABS: { id: BrowseTab; label: string; show: string; hide: string }[] = [
  {
    id: "body",
    label: "Body type",
    show: "group-has-[#browse-body:checked]/browse:block",
    hide: "group-has-[#browse-body:checked]/browse:hidden",
  },
  {
    id: "make",
    label: "Make",
    show: "group-has-[#browse-make:checked]/browse:block",
    hide: "group-has-[#browse-make:checked]/browse:hidden",
  },
  {
    id: "budget",
    label: "Budget",
    show: "group-has-[#browse-budget:checked]/browse:block",
    hide: "group-has-[#browse-budget:checked]/browse:hidden",
  },
  {
    id: "province",
    label: "Province",
    show: "group-has-[#browse-province:checked]/browse:block",
    hide: "group-has-[#browse-province:checked]/browse:hidden",
  },
];

/**
 * "Browse cars": one section with four ways in (body type, make, budget and province), the way
 * carwow and AutoTrader open theirs.
 *
 * It replaced a body type row followed by a long directory of make and province links, which
 * turned the lower half of the page into a list. Now the photo tiles are what a buyer sees, and the
 * other three are one tap away.
 *
 * NO JAVASCRIPT. The switch is a native radio group (arrow keys move between the options, as in
 * any radio group) and CSS shows the panel for the checked option with :has(). Every panel is in
 * the page, so every link is still there for a crawler, and a browser without :has() simply keeps
 * showing the first panel. The radios sit in no form, so they are never submitted.
 *
 * Every count is live, every link is a real results page, and nothing here is a manufacturer's
 * logo, which is another company's trade mark.
 */
export function HomeBrowse({
  bodyTiles,
  makes,
  budgets,
  provinces,
}: {
  bodyTiles: BodyTypeTile[];
  makes: MakeTile[];
  budgets: BudgetBand[];
  provinces: StockOption[];
}) {
  const available: Record<BrowseTab, boolean> = {
    body: bodyTiles.length > 0,
    make: makes.length > 0,
    budget: budgets.length > 0,
    province: provinces.length > 0,
  };
  const tabs = TABS.filter((tab) => available[tab.id]);
  const first = tabs[0];
  if (!first) return null;

  // The first panel shows unless another option is checked; the rest show only when theirs is.
  const hideFirst = tabs
    .filter((tab) => tab.id !== first.id)
    .map((tab) => tab.hide)
    .join(" ");
  const panelClass = (tab: (typeof TABS)[number]) =>
    tab.id === first.id ? `block ${hideFirst}` : `hidden ${tab.show}`;

  return (
    <section
      aria-labelledby="browse-heading"
      className="group/browse container-page py-[var(--section-base)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <h2 id="browse-heading" className="rn-h2">
          Browse cars
        </h2>

        {tabs.length > 1 ? (
          <fieldset className="min-w-0">
            <legend className="sr-only">Browse cars by</legend>
            <div className="flex gap-1 rounded-full border border-line-control bg-card p-1 shadow-xs md:inline-flex">
              {tabs.map((tab) => (
                <label
                  key={tab.id}
                  className="flex min-h-11 flex-auto cursor-pointer items-center justify-center rounded-full px-1.5 text-center text-[0.8125rem] font-semibold whitespace-nowrap text-body select-none hover:bg-subtle hover:text-heading has-[:checked]:bg-secondary has-[:checked]:text-on-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus min-[22rem]:px-3 min-[22rem]:text-sm md:px-5"
                >
                  <input
                    type="radio"
                    id={`browse-${tab.id}`}
                    name="home-browse"
                    value={tab.id}
                    defaultChecked={tab.id === first.id}
                    className="sr-only"
                  />
                  {tab.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className="mt-6">
        {tabs.map((tab) => (
          <div key={tab.id} className={panelClass(tab)}>
            {tab.id === "body" ? <BodyTypeTiles tiles={bodyTiles} /> : null}
            {tab.id === "make" ? <MakeTiles makes={makes} /> : null}
            {tab.id === "budget" ? <BudgetTiles budgets={budgets} /> : null}
            {tab.id === "province" ? <ProvinceList provinces={provinces} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The best-stocked makes as tiles (eight on a phone, twelve from 640px): the name, a live count
 * and the models with the most cars, so a tile says what that make's stock actually is. Crawlable
 * landing pages under /cars; every other make is in the filters, one link below.
 */
function MakeTiles({ makes }: { makes: MakeTile[] }) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {makes.slice(0, 12).map((make, index) => (
          <li key={make.slug} className={`flex min-w-0 ${index >= 8 ? "max-sm:hidden" : ""}`}>
            <Link
              href={`/cars/${make.slug}`}
              className="rn-card rn-card--interactive group flex w-full flex-col p-4 sm:p-5"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-base leading-snug font-semibold [overflow-wrap:anywhere] text-heading sm:text-lg">
                  {make.name}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-accent max-sm:hidden motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                />
              </span>
              <span className="text-sm text-muted tabular">{cars(make.count)}</span>
              {make.models.length > 0 ? (
                <span className="mt-3 line-clamp-2 border-t border-line pt-3 text-sm text-body">
                  {make.models.join(", ")}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link href="/cars" className="rn-link-arrow min-h-11">
          Every make in the filters
          <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}

/** Price bands with the number of cars in each, linking to results with the same band applied. */
function BudgetTiles({ budgets }: { budgets: BudgetBand[] }) {
  return (
    <ul className="grid gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {budgets.map((band) => (
        <li key={band.href} className="flex min-w-0">
          <Link
            href={band.href}
            className="rn-card rn-card--interactive group flex w-full flex-row items-center justify-between gap-4 p-5 xs:flex-col xs:items-start sm:p-6"
          >
            <span className="min-w-0">
              <span className="block text-lg font-semibold text-heading tabular sm:text-xl">
                {band.label}
              </span>
              <span className="mt-1 block text-sm text-muted tabular">{cars(band.count)}</span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-5 shrink-0 text-accent motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 xs:mt-auto"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Provinces, most stocked first, each with a thin bar for its share of the stock so the list reads
 * at a glance. The bar is drawn from the count printed beside it and hidden from assistive
 * technology, because the number already says it.
 */
function ProvinceList({ provinces }: { provinces: StockOption[] }) {
  const sorted = [...provinces].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const most = Math.max(1, sorted[0]?.count ?? 1);

  return (
    <ul className="grid gap-x-10 rounded-lg border border-line bg-card px-5 py-2 shadow-xs sm:grid-cols-2 sm:px-8 sm:py-4 lg:grid-cols-3">
      {sorted.map((province) => (
        <li key={province.slug} className="min-w-0 border-b border-line">
          <Link
            href={`/cars/in/${province.slug}`}
            className="group flex min-h-14 flex-col justify-center gap-2 py-3 no-underline"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-semibold text-heading group-hover:text-accent group-hover:underline group-hover:underline-offset-3">
                {province.name}
              </span>
              <span className="shrink-0 text-sm text-muted tabular">{cars(province.count)}</span>
            </span>
            <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-subtle">
              <span
                className="block h-full rounded-full bg-heading"
                style={{ width: `${Math.max(4, Math.round((province.count / most) * 100))}%` }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
