import Link from "next/link";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import type { HeroListing } from "@/components/home/home-stock";
import { DemoListingBadge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price-tag";

/**
 * The first screen: a navy band with the promise on the left and a real car on the right, and the
 * white search panel lifted over the band's lower edge.
 *
 * The panel sits OUTSIDE the `.on-navy` element on purpose. `.on-navy` re-points the focus ring
 * at its light blue and colours headings for a dark ground, and both are wrong on a white panel.
 *
 * The photograph is the page's one priority image, at the "gallery" rendition. It is a
 * demonstration listing, so it carries the Demo listing badge and the caption the listing page
 * carries: the photograph shows the model, not the car, with the Commons credit its licence asks
 * for.
 */
export function HomeHero({
  hero,
  eyebrow,
  lead,
  children,
}: {
  hero: HeroListing | null;
  eyebrow: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="hero-heading">
      <div className="on-navy">
        <div
          className={`container-page grid gap-6 pt-6 pb-20 sm:gap-8 sm:pt-10 lg:items-center lg:gap-12 lg:pt-14 lg:pb-28 ${
            hero ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""
          }`}
        >
          <div className="max-w-[36rem]">
            <p className="rn-eyebrow text-on-navy-muted">{eyebrow}</p>
            <h1 id="hero-heading" className="rn-h1 mt-3 text-on-navy">
              Know exactly who is selling you the car
            </h1>
            <p className="rn-lead mt-3 text-on-navy-muted sm:mt-5">{lead}</p>
          </div>

          {hero ? <HeroPhoto hero={hero} /> : null}
        </div>
      </div>

      <div className="container-page relative -mt-12 lg:-mt-20">{children}</div>
    </section>
  );
}

const HERO_SIZES = "(min-width: 80rem) 44rem, (min-width: 64rem) 56vw, 100vw";

function HeroPhoto({ hero }: { hero: HeroListing }) {
  const { card, photo, small } = hero;
  const srcSet = small ? `${small.url} ${small.width}w, ${photo.url} ${photo.width}w` : undefined;

  // The page's one priority image, preloaded with the same srcset so the browser fetches the
  // copy it will actually paint rather than discovering it once the HTML has been parsed.
  preload(photo.url, {
    as: "image",
    fetchPriority: "high",
    ...(srcSet ? { imageSrcSet: srcSet, imageSizes: HERO_SIZES } : {}),
  });

  const title = [card.modelYear, card.makeName, card.modelName].filter(Boolean).join(" ");

  return (
    <figure className="min-w-0">
      {/*
        One link for the whole picture. Its name is the title, variant and price in the chip (the
        image is alt="" inside it, so the car is not announced twice), and its focus ring is the
        navy band's light blue, which holds 3:1 against navy.
      */}
      <Link
        href={hero.href}
        className="group relative block aspect-[16/9] overflow-hidden rounded-lg bg-navy-raised shadow-overlay"
      >
        {/*
          A plain img with a srcset, because the image optimiser is off on purpose (next.config.ts)
          and next/image then writes a single 1280px src for every screen. A phone takes the 640px
          card copy of the same photograph instead, which is what brings the home page's largest
          paint under two seconds on a throttled mid-range Android. The matching preload is above.
        */}
        <img
          src={photo.url}
          srcSet={srcSet}
          sizes={srcSet ? HERO_SIZES : undefined}
          alt=""
          width={photo.width}
          height={photo.height}
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover object-[50%_55%] motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.02]"
        />

        <span className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-md bg-card px-3 py-2 shadow-overlay sm:bottom-4 sm:left-4 sm:w-[22rem] sm:max-w-[calc(100%-2rem)] sm:p-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-heading sm:text-base">
              {title}
            </span>
            {card.variantName ? (
              <span className="hidden truncate text-sm text-muted sm:block">
                {card.variantName}
              </span>
            ) : null}
          </span>
          <PriceTag as="span" value={card.price} size="sm" className="shrink-0" />
        </span>

        {card.isDemonstration ? (
          <DemoListingBadge onPhoto className="absolute top-3 left-3 sm:top-4 sm:left-4" />
        ) : null}
      </Link>

      {hero.credit ? (
        <figcaption className="mt-2 text-xs text-on-navy-muted">
          Photograph of this model, not of this car. {hero.credit}
        </figcaption>
      ) : null}
    </figure>
  );
}
