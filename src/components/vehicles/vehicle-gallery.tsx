import Image from "next/image";

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
      return {
        url: big.url,
        width: big.width,
        height: big.height,
        thumb: small ?? big,
        alt: row.alt?.trim() || media.alt?.trim() || name,
      };
    })
    .filter((shot): shot is NonNullable<typeof shot> => shot !== null);

  if (shots.length === 0) {
    const colour = vehicle.exteriorColour;
    const colourName = relName(colour);
    return (
      <figure className="m-0">
        <div className="-mx-[var(--container-pad)] sm:mx-0">
          <ColourPlate
            variant="hero"
            colourSwatch={colour && typeof colour === "object" ? (colour.swatch ?? null) : null}
            colourName={colourName}
            className="aspect-[16/10] rounded-none sm:aspect-[16/9] sm:rounded-lg"
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
          {shots.map((shot, index) => (
            <Image
              key={`${shot.url}-${index}`}
              id={`photo-${index + 1}`}
              src={shot.url}
              alt={many ? `${shot.alt}, photograph ${index + 1} of ${shots.length}` : shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="(min-width: 64rem) 60vw, 100vw"
              className="h-full w-full shrink-0 snap-start snap-always object-cover object-[50%_55%]"
              priority={index === 0}
            />
          ))}
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

      {credit ? (
        <figcaption className="mt-2 text-xs text-muted">
          Photograph of this model, not of this car. {credit}
        </figcaption>
      ) : null}
    </figure>
  );
}
