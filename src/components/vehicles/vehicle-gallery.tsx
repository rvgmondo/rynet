import Image from "next/image";

import { ColourPlate } from "@/components/vehicles/colour-plate";
import { populated, relName } from "@/lib/relations";
import { photoCredit } from "@/lib/vehicle-photo";
import type { Media, Vehicle } from "@/payload-types";

/**
 * The gallery.
 *
 * THE PHOTOGRAPH IS THE PAGE. Everything else on a listing is a number a buyer checks after
 * they have decided they like the look of the car, and every marketplace in this market is
 * built that way for the same reason.
 *
 * This used to render a grey box with a comment saying the real gallery would land later, and
 * before that a grey panel with a camera glyph. A listing page whose hero is a grey rectangle
 * is a listing page a buyer leaves.
 *
 * NO JAVASCRIPT, and the mechanism is a scroll-snap row rather than a stack of hidden images.
 *
 * The obvious build is a stage with the shots stacked and radio inputs switching them. It needs
 * one CSS rule per photograph index to map a checked radio to its own shot, because CSS cannot
 * derive one from the other, and a listing can have twenty photographs.
 *
 * A row that snaps needs none of that. Every shot is 100% of the frame, the frame scrolls
 * horizontally, and the thumbnails are ordinary anchors to each shot's id: the browser scrolls
 * the nearest scrollable ancestor, which is the frame. That gives touch swiping for free, keeps
 * the whole thing in the tab order, and works before hydration and with scripting off, which on
 * a phone on a slow connection is most of the time a buyer is looking at it.
 *
 * The colour plate stays for a listing with no photographs at all, which is a real state: a
 * dealership adds stock before it photographs it. It is a better answer than the broken-image
 * grey every other site shows, and it is drawn from the car's own recorded paint and odometer.
 */
export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const gallery = vehicle.gallery ?? [];
  const branch = populated(vehicle.branch);
  const colour = vehicle.exteriorColour;
  const credit = photoCredit(vehicle);

  const shots = gallery
    .map((row) => {
      const media = populated(row.image as number | Media | null);
      if (!media) return null;
      const sizes = media.sizes as
        | Record<string, { url?: string | null; width?: number | null; height?: number | null }>
        | undefined;
      const big = sizes?.hero ?? sizes?.gallery ?? sizes?.card;
      const small = sizes?.thumbnail ?? sizes?.card;
      if (!big?.url || !big.width || !big.height) return null;

      const path = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.pathname.startsWith("/api/media/") ? parsed.pathname : url;
        } catch {
          return url;
        }
      };

      return {
        id: media.id,
        url: path(big.url),
        width: big.width,
        height: big.height,
        thumb: small?.url ? path(small.url) : path(big.url),
        alt:
          row.alt?.trim() ||
          media.alt?.trim() ||
          [vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
            .filter(Boolean)
            .join(" "),
      };
    })
    .filter((shot): shot is NonNullable<typeof shot> => shot !== null);

  if (shots.length === 0) {
    return (
      <figure className="m-0">
        <ColourPlate
          variant="hero"
          publicRef={vehicle.publicRef}
          mileageKm={vehicle.mileageKm}
          colourSwatch={colour && typeof colour === "object" ? (colour.swatch ?? null) : null}
          colourFamily={colour && typeof colour === "object" ? (colour.family ?? null) : null}
          colourName={relName(colour)}
          provinceName={branch ? relName(branch.province) : null}
          cityName={branch ? relName(branch.city) : null}
          condition={vehicle.condition}
        />
        <figcaption className="rn-label rn-label--light mt-3 text-ink-muted">
          The dealership has not uploaded photographs. This is the car's recorded paint colour and
          its actual odometer reading, not a photograph.
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="rn-gallery m-0">
      <div
        className="rn-gallery__stage"
        // A scroll container holding more than one thing has to be reachable by keyboard, and
        // a region needs a name. Both only apply when there is something to scroll.
        {...(shots.length > 1
          ? { tabIndex: 0, role: "region", "aria-label": `${shots.length} photographs` }
          : {})}
      >
        {shots.map((shot, index) => (
          <Image
            key={`shot-${shot.id}`}
            id={`shot-${shot.id}`}
            src={shot.url}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            sizes="(min-width: 64rem) 60vw, 100vw"
            className="rn-gallery__shot"
            // The hero is the Largest Contentful Paint element on this page, so it is the one
            // image on the site genuinely worth preloading. The rest stay lazy.
            priority={index === 0}
          />
        ))}
      </div>

      {shots.length > 1 ? (
        <div className="rn-gallery__strip">
          {shots.map((shot, index) => (
            <a key={`thumb-${shot.id}`} href={`#shot-${shot.id}`}>
              <Image src={shot.thumb} alt="" width={160} height={120} aria-hidden="true" />
              <span className="sr-only">Photograph {index + 1}</span>
            </a>
          ))}
        </div>
      ) : null}

      {credit ? (
        /*
         * The attribution the licence obliges, under the photograph rather than on a page
         * nobody opens. Seeded stock is illustrated with photographs of the same MODEL from
         * Wikimedia Commons; this line says whose photograph it is, and the demonstration
         * marker elsewhere on the page says the car itself is not real.
         */
        <figcaption className="rn-label rn-label--light mt-3 text-ink-muted">
          Photograph of this model, not of this car. {credit}
        </figcaption>
      ) : null}
    </figure>
  );
}
