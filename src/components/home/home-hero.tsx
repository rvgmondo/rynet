import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import type { HeroListing } from "@/components/home/home-stock";
import { DemoListingBadge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price-tag";

/**
 * The first screen.
 *
 * FROM 640px: a navy band with the promise on the left and a photographed listing on the right,
 * and the white search panel lifted over the band's lower edge.
 *
 * ON A PHONE the order is the one a buyer needs: the heading, one short line, the search (keyword
 * and a full-width Search button inside the first screen), and only then the photograph, on the
 * page ground under the panel. The photograph used to sit above the search and pushed the Search
 * button below the fold; it was also the page's largest paint, so the least useful thing on the
 * screen decided the load time.
 *
 * The panel sits OUTSIDE the `.on-navy` element on purpose. `.on-navy` re-points the focus ring
 * at its light blue and colours headings for a dark ground, and both are wrong on a white panel.
 *
 * ONE PHOTOGRAPH, TWO PLACES. The phone copy and the wide copy are separate elements (one is
 * `display: none` at any width), and each is a <picture> whose other-width source is a 1px inline
 * GIF, so only the copy on screen is ever fetched: the 640px rendition on a phone whatever its
 * pixel density, the srcset from 640px up. Each has a matching preload scoped by `media`. It is a
 * demonstration listing, so it carries the Demo listing badge and the caption the listing page
 * carries: the photograph shows the model, not the car, with the Commons credit its licence asks
 * for.
 */
export function HomeHero({
  hero,
  eyebrow,
  lead,
  shortLead,
  secondary,
  children,
  below,
}: {
  hero: HeroListing | null;
  eyebrow: string;
  lead: ReactNode;
  /** The one line a phone gets instead of the lead. */
  shortLead: ReactNode;
  /** A quiet second route under the lead, from 640px. */
  secondary?: { href: string; label: string };
  /** The search panel. */
  children: ReactNode;
  /** What follows the photograph: the page's one demonstration notice. */
  below?: ReactNode;
}) {
  if (hero) preloadHero(hero);

  return (
    <section aria-labelledby="hero-heading">
      <div className="on-navy border-b border-line-on-navy">
        <div
          className={`container-page grid gap-8 pt-6 pb-14 sm:pt-10 sm:pb-20 lg:items-start lg:gap-12 lg:pt-14 lg:pb-28 ${
            hero ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""
          }`}
        >
          <div className="max-w-[36rem] lg:pt-8">
            <p className="rn-eyebrow text-on-navy-muted">{eyebrow}</p>
            <h1 id="hero-heading" className="rn-h1 mt-3 text-on-navy">
              Know exactly who is selling you the car
            </h1>
            <p className="rn-lead mt-3 text-on-navy-muted sm:hidden">{shortLead}</p>
            <p className="rn-lead mt-5 hidden text-on-navy-muted sm:block">{lead}</p>
            {secondary ? (
              <Link
                href={secondary.href}
                className="mt-6 hidden min-h-11 items-center gap-1.5 font-semibold text-on-navy underline decoration-on-navy-muted underline-offset-4 hover:decoration-on-navy sm:inline-flex"
              >
                {secondary.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </div>

          {hero ? (
            <div className="hidden sm:block">
              <HeroPhoto hero={hero} wide />
            </div>
          ) : null}
        </div>
      </div>

      <div className="container-page relative -mt-10 sm:-mt-12 lg:-mt-20">
        {children}

        {hero ? (
          <div className="mt-4 sm:hidden">
            <HeroPhoto hero={hero} wide={false} />
          </div>
        ) : null}

        {below}
      </div>
    </section>
  );
}

const WIDE = "(min-width: 40rem)";
const NARROW = "(max-width: 39.9375rem)";
const WIDE_SIZES = "(min-width: 80rem) 44rem, (min-width: 64rem) 56vw, 100vw";
/** A transparent 1px GIF: the source a hidden copy resolves to, so it costs no request. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function preloadHero({ photo, small }: HeroListing) {
  if (!small) {
    preload(photo.url, { as: "image", fetchPriority: "high" });
    return;
  }
  preload(small.url, { as: "image", fetchPriority: "high", media: NARROW });
  preload(photo.url, {
    as: "image",
    fetchPriority: "high",
    media: WIDE,
    imageSrcSet: `${small.url} ${small.width}w, ${photo.url} ${photo.width}w`,
    imageSizes: WIDE_SIZES,
  });
}

function HeroPhoto({ hero, wide }: { hero: HeroListing; wide: boolean }) {
  const { card, photo, small } = hero;
  const phone = small ?? photo;
  const srcSet = small ? `${small.url} ${small.width}w, ${photo.url} ${photo.width}w` : undefined;
  const title = [card.modelYear, card.makeName, card.modelName].filter(Boolean).join(" ");

  return (
    <figure className="min-w-0">
      {/*
        One link for the whole picture. Its name is the title, variant and price in the chip (the
        image is alt="" inside it, so the car is not announced twice).
      */}
      <Link
        href={hero.href}
        className={`group relative block aspect-[16/9] overflow-hidden rounded-lg shadow-overlay ${
          wide ? "bg-navy-raised" : "bg-subtle"
        }`}
      >
        <picture>
          <source media={wide ? NARROW : WIDE} srcSet={BLANK} />
          <img
            src={wide ? photo.url : phone.url}
            srcSet={wide ? srcSet : undefined}
            sizes={wide && srcSet ? WIDE_SIZES : undefined}
            alt=""
            width={wide ? photo.width : phone.width}
            height={wide ? photo.height : phone.height}
            fetchPriority="high"
            decoding="async"
            className="size-full object-cover object-[50%_60%] motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.02]"
          />
        </picture>

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
        <figcaption
          className={`mt-2 truncate text-xs ${wide ? "text-on-navy-muted" : "text-muted"}`}
        >
          Photograph of this model, not of this car.{" "}
          <span className="max-sm:sr-only">{hero.credit}</span>
          <span className="sm:hidden">
            {" "}
            <a href="#photo-credits" className="underline underline-offset-2">
              Credit
            </a>
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
