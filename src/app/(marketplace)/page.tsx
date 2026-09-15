import type { Metadata } from "next";

import { BodyTypeTiles, ChipLinks, MakeGrid } from "@/components/home/home-browse";
import { HomeHero } from "@/components/home/home-hero";
import { PhotoCredits, SellAndListBands, VerificationSteps } from "@/components/home/home-sections";
import { getHomeStock } from "@/components/home/home-stock";
import { HeroSearch } from "@/components/marketplace/hero-search";
import { Notice } from "@/components/ui/notice";
import { SectionHeader } from "@/components/ui/section-header";
import { ColourWall } from "@/components/vehicles/colour-wall";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getHomeData } from "@/lib/home-data";
import { organisationJsonLd, websiteJsonLd } from "@/lib/structured-data";

/**
 * Marketplace home, in the SHOWROOM design.
 *
 * The first screen answers the two things a buyer arrives with: are there cars here, and can I
 * search them. So it opens on a navy band with a photographed listing beside the promise, and a
 * white search panel with make, model, price and province lifted over the band's edge. After it,
 * in order: the newest cars as a scroll-snap row, body types as photo tiles, makes with counts,
 * provinces and colours, the three checks every dealership goes through, and the two other doors
 * (selling a car to dealerships, and a dealership applying to list).
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

export default async function HomePage() {
  // getHomeData's own featured list is not used here (getHomeStock picks photographed cars), so it
  // is asked for none and reads only the counts, provinces and colours.
  const [data, stock] = await Promise.all([getHomeData(0), getHomeStock()]);

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

  const allCarsLabel = allDemonstration ? "Browse every demo listing" : "Browse every car";

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

      <HomeHero
        hero={stock.hero}
        eyebrow="Cars for sale from dealerships only"
        lead="Only registered dealerships can list on Rynet, and our team checks each one before its first car goes live. No private sellers, and no way to become one."
      >
        <div className="rn-panel p-4 shadow-overlay min-[22.5rem]:p-5 sm:p-6 lg:p-8">
          <HeroSearch
            makes={stock.makes}
            models={stock.models}
            provinces={data.provinces}
            prices={stock.prices}
            submitLabel={submitLabel}
          />
        </div>

        {hasDemonstration ? (
          <Notice
            title={
              allDemonstration
                ? "Every listing on Rynet is a demonstration for now"
                : "Some listings are demonstrations"
            }
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
      </HomeHero>

      {stock.featured.length > 0 ? (
        <section
          aria-labelledby="fresh-heading"
          className="container-page pt-[var(--section-base)]"
        >
          <SectionHeader
            id="fresh-heading"
            title="Just listed"
            lead="The newest cars on Rynet, with no more than two from any one dealership."
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

      {stock.bodyTypes.length > 0 ? (
        <section aria-labelledby="body-heading" className="container-page pt-[var(--section-base)]">
          <SectionHeader id="body-heading" title="Browse by body type" />
          <div className="mt-6">
            <BodyTypeTiles tiles={stock.bodyTypes} />
          </div>
        </section>
      ) : null}

      {stock.makes.length > 0 ? (
        <section
          aria-labelledby="make-heading"
          className="rn-defer container-page py-[var(--section-base)]"
        >
          <SectionHeader id="make-heading" title="Browse by make" />
          <div className="mt-6">
            <MakeGrid makes={stock.makes} />
          </div>

          {data.provinces.length > 0 || data.colours.length > 0 ? (
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
              {data.provinces.length > 0 ? (
                <div>
                  <h3 className="rn-h3 text-lg">By province</h3>
                  <div className="mt-4">
                    <ChipLinks items={data.provinces} href={(slug) => `/cars/in/${slug}`} />
                  </div>
                </div>
              ) : null}
              {data.colours.length > 0 ? (
                <div>
                  <h3 className="rn-h3 text-lg">By colour</h3>
                  <ColourWall colours={data.colours} limit={10} className="mt-4" />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <VerificationSteps />

      <SellAndListBands />

      <PhotoCredits credits={stock.credits} />
    </>
  );
}
