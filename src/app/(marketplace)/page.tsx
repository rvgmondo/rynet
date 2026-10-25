import type { Metadata } from "next";
import { FloorSearch } from "@/components/home/floor-search";
import { FloorSection } from "@/components/home/floor-section";
import { getFloor } from "@/components/home/floor-stock";
import { HomeBrowse } from "@/components/home/home-browse";
import { DealerStrip, getHomeDealers } from "@/components/home/home-dealers";
import {
  ClosingSearch,
  PhotoCredits,
  SellAndListBands,
  VerificationSteps,
} from "@/components/home/home-sections";
import { getHomeStock } from "@/components/home/home-stock";
import { paramsFromSearch, readState } from "@/components/search/params";
import { countSearch } from "@/components/search/stock";
import { Notice } from "@/components/ui/notice";
import { SectionHeader } from "@/components/ui/section-header";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getHomeData } from "@/lib/home-data";
import { organisationJsonLd, websiteJsonLd } from "@/lib/structured-data";

/**
 * Marketplace home, in the FLOOR design.
 *
 * The first screen answers the two things a buyer arrives with: are there cars here, and can I
 * search them. So it opens on one box that takes the car in the buyer's own words ("automatic SUV
 * under R 250 000", or said out loud), with every photographed car laid on a showroom floor behind
 * it. As the words come in, the matching cars light up, the box says back what it understood, and
 * the button carries the count /cars will show (see src/components/home/floor-search.tsx). After
 * it, in order: the newest cars as a scroll-snap row, one "Browse cars" section
 * that switches between body type photo tiles, make tiles, budget bands and provinces (no
 * JavaScript), the four checks every dealership goes through as a short numbered list, and one
 * panel with the two other doors (selling a car to dealerships, and a dealership applying to
 * list). Paint colours are a filter on /cars, not a home page section: nobody shops by a
 * manufacturer's paint name.
 *
 * Every figure is a live query and nothing is invented: no statistics, no reviews, no logos, no
 * testimonials. The listings are demonstration data today, so the one count the page shows (on
 * the search button) carries that word with it, every card carries its Demo listing badge, and
 * one calm notice under the search says what is example data and what is real.
 */

/*
 * Rendered on demand, never at build time.
 *
 * `revalidate` would opt the route into static generation, and `next build` has no database, so
 * the build dies with "no such table: vehicles". The one minute cache lives on the data instead,
 * in getHomeData and getHomeStock, which are both wrapped in unstable_cache.
 */
export const dynamic = "force-dynamic";

/* Without a canonical, every query string a campaign or a share appends is a duplicate front page. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Ready-made searches under the box, each shown with the count it finds today. One that finds
 * nothing is left out, so a suggestion never leads to an empty page.
 */
const EXAMPLES = [
  "Automatic SUV under R 250 000",
  "Diesel bakkie",
  "VW Polo",
  "R 4 000 a month",
  "2018 or newer under 120 000 km",
  "Cheapest hatchback",
];

export default async function HomePage() {
  // getHomeData's own featured list is not used here (getHomeStock picks photographed cars), so it
  // is asked for none and reads only the counts, provinces and colours.
  const [data, stock, floor, dealers, exampleCounts] = await Promise.all([
    getHomeData(0),
    getHomeStock(),
    getFloor(),
    getHomeDealers(),
    Promise.all(
      EXAMPLES.map((text) =>
        countSearch(readState(paramsFromSearch(new URLSearchParams({ q: text })))).catch(() => 0),
      ),
    ),
  ]);
  const examples = EXAMPLES.map((text, i) => ({ text, count: exampleCounts[i] ?? 0 })).filter(
    (example) => example.count > 0,
  );

  // Every Commons photograph on the page owes its credit, the floor's thumbnails included.
  const credits = [
    ...new Map(
      [...stock.credits, ...floor.credits].map((line) => [`${line.subject}|${line.credit}`, line]),
    ).values(),
  ].sort((a, b) => a.subject.localeCompare(b.subject, "en-ZA"));

  const hasDemonstration = data.demonstrationCount > 0;
  const allDemonstration = hasDemonstration && data.demonstrationCount >= data.totalLive;

  /*
   * The count lives on the search button and nowhere else. While every listing is demonstration
   * data the word travels with the figure, in the same words as the badge on each card.
   */
  const submitLabel =
    data.totalLive === 0
      ? "Search cars"
      : allDemonstration
        ? `Search ${plural(data.totalLive, "demo listing", "demo listings")}`
        : `Search ${plural(data.totalLive, "car", "cars")}`;

  /*
   * The line under the floor before anything is typed. Demonstration stock never borrows the
   * word "checked": that is the promise about real dealerships, and hard rule 1 keeps it theirs.
   */
  const idleStatus = allDemonstration
    ? `${plural(data.totalLive, "demo listing", "demo listings")} to try the search on. Type and watch.`
    : hasDemonstration
      ? `${plural(data.totalLive, "car", "cars")}, some of them demo listings. Type and watch.`
      : `${plural(data.totalLive, "car", "cars")} from checked dealerships. Type and watch.`;

  const allCarsLabel = allDemonstration ? "Browse every demo listing" : "Browse every car";

  /*
   * Body types with enough stock to be worth a photo tile. A tile reading "Sedan: 2 cars" looked
   * empty beside "SUV: 122 cars"; a small type is still one tap away in the filters. Four at most,
   * so the row is always whole.
   */
  const bodyTiles = stock.bodyTypes.filter((tile) => tile.count >= 10).slice(0, 4);

  return (
    <>
      {/* Structured data about Rynet itself, so neither block depends on whether the stock is real. */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from a literal we constructed.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteJsonLd(), organisationJsonLd()]),
        }}
      />

      <FloorSection tiles={floor.tiles}>
        <FloorSearch
          all={data.totalLive}
          idleLabel={submitLabel}
          idleStatus={idleStatus}
          noun={allDemonstration ? ["demo listing", "demo listings"] : ["car", "cars"]}
          examples={examples}
        />
      </FloorSection>

      <div className="container-page">
        {hasDemonstration ? (
          <Notice
            compact
            title={
              allDemonstration
                ? "Every listing is a demonstration for now. Nothing here is for sale."
                : "Some listings are demonstrations, and those are not for sale."
            }
            details={allDemonstration ? "Why these are examples" : "What that means"}
            className="mt-4 sm:mt-6"
          >
            {allDemonstration ? (
              <p>
                The cars and dealerships you can browse are example data, there to show how Rynet
                works. None of these cars is for sale and none of these dealerships exists. The
                search, the filters and the checks a dealership must pass before it can list are all
                real.
              </p>
            ) : (
              <p>
                A listing marked Demo listing is example data, there to show how Rynet works. That
                car is not for sale.
              </p>
            )}
          </Notice>
        ) : null}
      </div>

      {stock.featured.length > 0 ? (
        <section
          aria-labelledby="fresh-heading"
          className="container-page pt-[var(--section-base)]"
        >
          <SectionHeader
            id="fresh-heading"
            title="Just listed"
            lead="The newest cars on Rynet, every one from a checked dealership."
            action={{ href: "/cars", label: allCarsLabel }}
          />

          {/*
            Four across from 1280px; below that one scrolling row that runs to the screen edge, so
            the next card peeks in. The negative margin only undoes the container padding, so the
            row is never wider than the page.
          */}
          <ul className="rn-grid rn-grid--floor mt-6 max-xl:-mx-[var(--container-pad)] max-xl:scroll-px-[var(--container-pad)] max-xl:px-[var(--container-pad)]">
            {stock.featured.map((vehicle) => (
              <li key={vehicle.publicRef}>
                <VehicleCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HomeBrowse
        bodyTiles={bodyTiles}
        makes={stock.makeTiles}
        budgets={stock.budgets}
        provinces={data.provinces}
      />

      <DealerStrip dealers={dealers} />

      <div className="pt-[var(--section-base)]">
        <VerificationSteps />
      </div>

      <SellAndListBands />

      <ClosingSearch total={allDemonstration ? 0 : data.totalLive} />

      <PhotoCredits credits={credits} />
    </>
  );
}
