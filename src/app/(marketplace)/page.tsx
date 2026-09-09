import Link from "next/link";

import { HeroSearch } from "@/components/marketplace/hero-search";
import { ColourWall } from "@/components/vehicles/colour-wall";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getHomeData } from "@/lib/home-data";

/**
 * Marketplace home.
 *
 * It used to fetch nothing and show no cars, which is why it read as a leaflet rather than
 * as a marketplace. Everything on this page now comes from a live query: the counts in the
 * dateline, the eight cars on the floor, the browse lists, the colour wall. Nothing is
 * invented, there is no logo wall, no testimonials and no stock photography, because Rynet
 * has no clients to name and no photographs to show.
 *
 * The search leads and it is the second thing on the page rather than the fifth, because a
 * buyer arriving here wants to start filtering and every scroll before that is friction.
 * There is no hero image, which is a performance decision as much as an aesthetic one: a
 * full-bleed photograph becomes the largest contentful paint, and the budget is 2.0s on a
 * throttled mid-tier Android.
 */

/*
 * Rendered on demand, never at build time.
 *
 * `revalidate` was the obvious-looking way to say "recompute these counts every minute",
 * and it broke the deploy: it opts the route into static generation, so Next tried to
 * prerender the home page during `next build`, where there is no database, and the build
 * died with "no such table: vehicles". The counts are live data from a database that only
 * exists at runtime, so the PAGE has to be dynamic.
 *
 * The one minute cache still exists, it just lives on the data instead of the route. See
 * getHomeData, which is wrapped in unstable_cache.
 */
export const dynamic = "force-dynamic";

/** The mega counter never shouts a number that would be better not shouted. */
const COUNTER_FLOOR = 150;

export default async function HomePage() {
  const data = await getHomeData(8);
  const provinceCount = data.provinces.length;

  const today = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  /*
   * Eight chips, each a real indexable link into a real result set. Four are the body types
   * that actually have the most stock right now rather than the four somebody guessed, so a
   * chip can never land on an empty page. That is a buyer's whole journey in one tap, and
   * eight free landing paths for search engines.
   */
  const chips = [
    ...data.bodyTypes.slice(0, 4).map((tile) => ({
      label: tile.name,
      href: `/cars?body=${tile.slug}`,
    })),
    { label: "Under R150k", href: "/cars?maxPrice=150000" },
    { label: "Under R300k", href: "/cars?maxPrice=300000" },
    { label: "Automatic", href: "/cars?transmission=automatic" },
    { label: "Diesel", href: "/cars?fuel=diesel" },
  ];

  return (
    <>
      {/* 1. THE DATELINE. Every figure is a live count, and the date is what makes the site
             read as issued today rather than built once. Separators are 1px rules, not
             punctuation. */}
      <div className="container-page">
        <p className="rn-run rn-label text-ink-muted py-3">
          <span>Rynet Showroom</span>
          <span className="hidden sm:inline">The register of verified dealer stock</span>
          <span>{today}</span>
          <span className="tabular">{data.totalLive} cars</span>
          <span className="tabular">{data.dealershipCount} dealerships</span>
          <span className="tabular">{provinceCount} provinces</span>
        </p>
      </div>

      {/* 2. THE RULE. The tachometer sweep unrolled to the full width of the page. One of
             only two places brand red appears, and it carries no text. */}
      <div className="container-page">
        <hr className="rn-rule rn-rule--brand" />
      </div>

      {/* 3. THE HERO. */}
      <section aria-labelledby="hero-heading">
        {/* The exposed twelve column grid is the single thing that stops a page this bare
            reading as student brutalism: the structure is visibly on purpose. It costs one
            repeating gradient and it is hidden below 768px, where twelve hairlines on a
            phone would just be noise. */}
        <div className="rn-columns container-page pb-[var(--section-base)] pt-[var(--section-tight)]">
          <p className="rn-label text-ink">
            Verified dealerships only. {data.totalLive} cars. {data.dealershipCount} dealerships.
          </p>

          {/* Hand-broken on purpose. Expanded Archivo at 800 across three lines produces an
              accidental-looking rag if it is left to wrap, and text-wrap: balance does not
              save it at this size. */}
          <h1
            id="hero-heading"
            className="rn-display rn-display--fill mt-10"
            /* The longest line is "NO PRIVATE", ten characters. The stylesheet divides the
               container width by it, which is what makes the headline fill the measure at
               every width instead of stopping halfway across a wide screen. */
            style={{ "--head-chars": 10 } as React.CSSProperties}
          >
            No private
            <br />
            sellers.
            <br />
            Not one.
          </h1>

          <p className="measure mt-8 text-lead text-ink-secondary">
            Every car on Rynet is listed by a registered South African dealership with a name, an
            address and a trading licence we have checked.
          </p>

          <HeroSearch className="mt-10" />

          <ul className="mt-8 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip.href}>
                <Link
                  href={chip.href}
                  className="rn-label inline-flex min-h-11 items-center rounded-full border border-line-interactive px-4 text-ink-muted hover:bg-ink hover:text-ink-inverse"
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-8">
            <Link href="/cars" className="rn-label text-ink">
              Or browse all {data.totalLive} entries
            </Link>
          </p>
        </div>
      </section>

      {/* 4. FRESH ON THE FLOOR. Real stock, as colour, with not one photograph and not one
             invented listing. */}
      {data.featured.length > 0 ? (
        <section
          aria-labelledby="fresh-heading"
          className="container-page pb-[var(--section-base)]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5">
            <h2 id="fresh-heading" className="rn-head">
              Fresh on the floor
            </h2>
            <Link href="/cars?sort=newest" className="rn-label text-ink-muted hover:text-ink">
              All newest stock
            </Link>
          </div>
          <hr className="rn-rule" />

          <ul className="rn-grid rn-grid--floor mt-6">
            {data.featured.map((vehicle, index) => (
              <li key={vehicle.publicRef} className="flex">
                <VehicleCard vehicle={vehicle} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 5. THE NUMBERS. */}
      <section
        aria-labelledby="numbers-heading"
        className="container-page pb-[var(--section-base)]"
      >
        <h2 id="numbers-heading" className="sr-only">
          The register in numbers
        </h2>
        <hr className="rn-rule rn-rule--brand" />

        <dl className="mt-8 grid gap-8 sm:grid-cols-3 sm:divide-x sm:divide-line">
          {/*
            The counter floor. A big number is impressive at 311 and an embarrassment at 40
            rendered at poster scale, so below the floor the vehicle count simply does not
            appear at this size. The template must never shout a figure it would be better
            not to shout.
          */}
          {data.totalLive >= COUNTER_FLOOR ? (
            <div>
              <dd className="rn-mega">{data.totalLive}</dd>
              <dt className="rn-label mt-2 text-ink-muted">Cars on the register</dt>
            </div>
          ) : null}
          <div className="sm:ps-8">
            <dd className="rn-mega">{data.dealershipCount}</dd>
            <dt className="rn-label mt-2 text-ink-muted">Verified dealerships</dt>
          </div>
          <div className="sm:ps-8">
            <dd className="rn-mega">{provinceCount}</dd>
            <dt className="rn-label mt-2 text-ink-muted">Provinces</dt>
          </div>
        </dl>

        {/*
          Said plainly rather than hidden. The seeded stock exists to build and test the
          platform, and a headline count that quietly includes it would be a fabricated
          statistic. This line disappears by itself the day real listings outnumber it.
        */}
        {data.demonstrationCount > 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            <span className="tabular">{data.demonstrationCount}</span> of these listings are
            demonstration entries, seeded while the platform is being built. They are marked on
            every card and they are not for sale.
          </p>
        ) : null}
      </section>

      {/* 6. BROWSE BY COLOUR. The wall as navigation: generated from data, honest, and a
             filter a buyer genuinely uses. */}
      {data.colours.length > 0 ? (
        <section aria-labelledby="colour-heading" className="pb-[var(--section-base)]">
          <div className="container-page">
            <h2 id="colour-heading" className="rn-head pb-5">
              Browse by colour
            </h2>
            <hr className="rn-rule" />
          </div>
          <ColourWall colours={data.colours} className="mt-6" />
        </section>
      ) : null}

      {/* 7. BROWSE BY BODY TYPE, AND BY PROVINCE. Two plain typographic lists with live
             counts. No icons, no cards. */}
      <section className="container-page pb-[var(--section-base)]">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <BrowseList
            id="body-heading"
            title="Browse by body type"
            base="/cars?body="
            tiles={data.bodyTypes}
          />
          <BrowseList
            id="province-heading"
            title="Browse by province"
            base="/cars?province="
            tiles={data.provinces}
          />
        </div>
      </section>

      {/* 8. WHAT VERIFIED MEANS. A full-bleed ink band, three editorial columns in the prose
             face. The three icon-and-paragraph cards that used to sit here were the most
             template-like object on the site and they are deleted, not restyled. */}
      <section aria-labelledby="verified-heading" className="bg-surface-inverse text-ink-inverse">
        <div className="container-page py-[var(--section-base)]">
          <h2 id="verified-heading" className="rn-head">
            What verified means
          </h2>
          <hr className="mt-6 h-px border-0 bg-silver" />

          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-silver">
            {[
              {
                title: "A registered business, checked",
                body: "We verify the CIPC registration, the trading address and the motor trade number before a single car goes live. A dealership that has not cleared all three cannot publish, and that is enforced in the database rather than promised in a paragraph.",
              },
              {
                title: "Stock that is actually there",
                body: "Dealerships keep their own listings current through their portal. Stale stock is flagged and pulled rather than left up to waste your Saturday driving to Benoni for a car that sold last week.",
              },
              {
                title: "One dealership per listing",
                body: "Every car belongs to exactly one verified dealership, and you can see which one before you pick up the phone. A private individual cannot create a listing here through any route at all.",
              },
            ].map((column, index) => (
              <div key={column.title} className={index === 0 ? "md:pe-8" : "md:px-8"}>
                <h3 className="rn-label">{column.title}</h3>
                <p className="rn-prose rn-prose--drop mt-4">{column.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-10">
            <Link href="/how-verification-works" className="rn-label text-ink-inverse underline">
              Read the full verification process
            </Link>
          </p>
        </div>
      </section>

      {/* 9. SELL TO A DEALER. */}
      <section aria-labelledby="sell-heading" className="container-page py-[var(--section-base)]">
        <h2 id="sell-heading" className="rn-head max-w-[16ch]">
          Selling instead? Put it in front of five dealerships.
        </h2>
        <p className="rn-prose mt-5 text-ink-secondary">
          Tell us what you have and we pass it to up to five verified dealerships that buy that make
          in your province. You are not listing it here, and we do not put a price on your car.
        </p>
        <p className="mt-8">
          <Link
            href="/sell-to-a-dealer"
            className="rn-label inline-flex min-h-12 items-center bg-ink px-6 text-ink-inverse hover:bg-accent-solid hover:text-ink-on-accent"
          >
            Offer your car to a dealership
          </Link>
        </p>
        <hr className="rn-rule rn-rule--brand mt-10" />
      </section>
    </>
  );
}

/**
 * One browse list. A ruled table of names and live counts, right-aligned and tabular so the
 * figures form a single column you can read down in one movement.
 */
function BrowseList({
  id,
  title,
  base,
  tiles,
}: {
  id: string;
  title: string;
  base: string;
  tiles: { slug: string; name: string; count: number }[];
}) {
  if (tiles.length === 0) return null;

  return (
    <div>
      <h2 id={id} className="rn-label pb-4 text-ink-muted">
        {title}
      </h2>
      <ul className="border-t border-line-strong">
        {tiles.map((tile) => (
          <li key={tile.slug} className="border-b border-line">
            <Link
              href={`${base}${tile.slug}`}
              className="rn-row flex min-h-14 items-center justify-between gap-4 px-2 text-base font-medium"
            >
              <span className="truncate">{tile.name}</span>
              <span className="rn-card__muted shrink-0 tabular text-sm">{tile.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
