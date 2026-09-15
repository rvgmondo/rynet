import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { preload } from "react-dom";

import { GalleryControls } from "@/components/listing/gallery-controls";
import { ColourPlate } from "@/components/vehicles/colour-plate";
import { populated, relName } from "@/lib/relations";
import { photoCredit, pick } from "@/lib/vehicle-photo";
import type { Media, Vehicle } from "@/payload-types";

/**
 * The gallery. The photograph is the page.
 *
 * A large rounded photograph, edge to edge on a phone and set in its column with a soft shadow
 * from 640px, with a thumbnail strip under it when there is more than one shot.
 *
 * NO JAVASCRIPT CAROUSEL. The mechanism is a scroll-snap row: every shot is the full width of the
 * frame, the frame scrolls sideways, and each thumbnail is an ordinary link to its shot, which the
 * browser scrolls into place. Swiping, keyboard scrolling and the thumbnails all work before
 * hydration and with scripting off. GalleryControls adds arrows, a counter and in-place thumbnail
 * scrolling once it mounts, and nothing breaks if it never does.
 *
 * PERFORMANCE. The first shot is the page's largest contentful paint and the one priority image on
 * it; every other shot and thumbnail is lazy. Renditions come through pick(), never
 * `sizes.hero ?? sizes.gallery`: Payload stores a skipped size as an object with a null url, and
 * that one line once drew the placeholder over every photographed listing.
 *
 * HONESTY. The demonstration stock is illustrated with photographs of the same MODEL from
 * Wikimedia Commons. The caption says so, and carries the credit the licence requires, under the
 * photograph where it is owed rather than on a page nobody opens.
 *
 * No photographs at all is a real state (a dealership lists before it photographs), and it gets
 * the shared placeholder with the car's recorded colour, at a calmer 16:9 so it does not claim the
 * space a photograph would.
 */
const STAGE_ID = "listing-gallery";
const STRIP_ID = "listing-gallery-thumbs";

export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const credit = photoCredit(vehicle);
  const name = [vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
    .filter(Boolean)
    .join(" ");

  const shots = (vehicle.gallery ?? [])
    .map((row) => {
      const media = populated(row.image as number | Media | null);
      if (!media) return null;
      const big = pick(media, "gallery");
      if (!big) return null;
      const small = pick(media, "thumbnail");
      const card = pick(media, "card");
      return {
        url: big.url,
        width: big.width,
        height: big.height,
        phone: card && card.url !== big.url ? card : null,
        thumb: small ?? big,
        alt: row.alt?.trim() || media.alt?.trim() || name,
      };
    })
    .filter((shot): shot is NonNullable<typeof shot> => shot !== null);

  if (shots.length === 0) {
    const colour = vehicle.exteriorColour;
    const colourName = relName(colour);
    // A short band, not a photograph-sized box: the page opens on the facts beside it instead of
    // on a large empty picture.
    return (
      <figure className="m-0">
        <div className="-mx-[var(--container-pad)] sm:mx-0">
          <ColourPlate
            variant="hero"
            colourSwatch={colour && typeof colour === "object" ? (colour.swatch ?? null) : null}
            colourName={colourName}
            bodyName={relName(vehicle.bodyType)}
            className="aspect-[2/1] max-h-[17.5rem] w-full rounded-none sm:aspect-[3/1] sm:rounded-lg"
          />
        </div>
        <figcaption className="mt-2 text-xs text-muted">
          No photographs of this car yet.
          {colourName ? " The colour shown is the one recorded on the listing." : null}
        </figcaption>
      </figure>
    );
  }

  const many = shots.length > 1;
  const first = shots[0];

  /*
   * The first photograph is the page's largest paint. It is a plain <picture> rather than
   * next/image, because with the optimiser off next/image writes one 1280px src with no preload
   * and no fetch priority: a phone gets the 640px card copy whatever its pixel density, a wider
   * screen the gallery copy, and each has a preload scoped to its width.
   */
  if (first?.phone) {
    preload(first.phone.url, {
      as: "image",
      fetchPriority: "high",
      media: "(max-width: 39.9375rem)",
    });
    preload(first.url, { as: "image", fetchPriority: "high", media: "(min-width: 40rem)" });
  } else if (first) {
    preload(first.url, { as: "image", fetchPriority: "high" });
  }

  return (
    <figure className="m-0">
      {/*
        The stage clips its own photographs to the rounded corner, not the wrapper. A wrapper with
        overflow hidden would also clip the stage's focus ring. On a phone the stage runs to both
        screen edges, so there the ring is drawn just inside it instead of off the screen.
      */}
      <div className="relative -mx-[var(--container-pad)] bg-subtle sm:mx-0 sm:rounded-lg sm:shadow-card">
        <div
          id={STAGE_ID}
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] max-sm:focus-visible:outline-offset-[-4px] sm:aspect-[3/2] sm:rounded-lg [&::-webkit-scrollbar]:hidden"
          // A scroll container holding more than one photograph has to be reachable by keyboard,
          // and a region needs a name. Neither applies to a single photograph.
          {...(many
            ? { tabIndex: 0, role: "region", "aria-label": `Photographs, ${shots.length} in all` }
            : {})}
        >
          {shots.map((shot, index) => {
            const alt = many ? `${shot.alt}, photograph ${index + 1} of ${shots.length}` : shot.alt;
            const classes =
              "h-full w-full shrink-0 snap-start snap-always object-cover object-[50%_55%]";
            return index === 0 ? (
              <picture key={`${shot.url}-${index}`} className="contents">
                {shot.phone ? (
                  <source media="(max-width: 39.9375rem)" srcSet={shot.phone.url} />
                ) : null}
                <img
                  id="photo-1"
                  src={shot.url}
                  alt={alt}
                  width={shot.width}
                  height={shot.height}
                  fetchPriority="high"
                  decoding="async"
                  className={classes}
                />
              </picture>
            ) : (
              <Image
                key={`${shot.url}-${index}`}
                id={`photo-${index + 1}`}
                src={shot.url}
                alt={alt}
                width={shot.width}
                height={shot.height}
                sizes="(min-width: 64rem) 60vw, 100vw"
                className={classes}
              />
            );
          })}
        </div>

        {many ? (
          <GalleryControls stageId={STAGE_ID} stripId={STRIP_ID} count={shots.length} />
        ) : null}
      </div>

      {many ? (
        // Four pixels of padding inside the scrolling strip, taken back with a negative margin, so
        // a thumbnail's focus ring and current-photograph ring are not clipped by the scroll box.
        <div id={STRIP_ID} className="-mx-1 mt-2 hidden gap-2 overflow-x-auto p-1 sm:flex">
          {shots.map((shot, index) => (
            <a
              key={`thumb-${shot.url}-${index}`}
              href={`#photo-${index + 1}`}
              data-shot={index}
              aria-current={index === 0 ? "true" : undefined}
              className="block aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-sm opacity-70 ring-offset-2 ring-offset-page transition-opacity duration-[var(--duration-micro)] hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-heading lg:w-24"
            >
              <Image
                src={shot.thumb.url}
                alt=""
                width={shot.thumb.width}
                height={shot.thumb.height}
                sizes="6rem"
                className="h-full w-full object-cover"
              />
              <span className="sr-only">Show photograph {index + 1}</span>
            </a>
          ))}
        </div>
      ) : null}

      {/*
        The caveat on one line, always visible; the photographer and licence one tap away in a
        native disclosure, so the attribution the licence asks for stays with the photograph
        without pushing the title and price further down the most valuable screen of the page.
      */}
      {credit ? (
        <figcaption className="mt-2 text-xs text-muted">
          <details className="group">
            <summary className="flex min-h-6 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 truncate">Photograph of this model, not of this car.</span>
              <span className="rn-link inline-flex shrink-0 items-center gap-0.5">
                Photo credit
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-180"
                />
              </span>
            </summary>
            <p className="pt-0.5">{credit}</p>
          </details>
        </figcaption>
      ) : null}
    </figure>
  );
}
