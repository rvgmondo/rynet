import { ColourPlate } from "@/components/vehicles/colour-plate";
import { populated, relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

/**
 * The gallery.
 *
 * There is no vehicle photography yet, and this used to render a grey panel with a camera
 * icon saying so. That is the single most expensive thing a listing page can look like: a
 * buyer reads a grey rectangle as a broken image, not as an honest disclosure.
 *
 * So the listing opens on the colour plate at full size instead, drawn from the car's own
 * recorded paint, with the tachometer reading its real odometer. It is a fact about this
 * car, drawn large, and it is the same object the search grid uses so the page does not
 * change shape on photo day. The caption under it says plainly what it is, once.
 *
 * This is the ONE place in the product where the arc animates, and it happens once per page
 * load. Twenty-four sweeping gauges in a results grid is a slot machine; one, on the page
 * about one car, is an instrument cluster on ignition.
 *
 * The lightbox, thumbnail strip, keyboard navigation and 360 tab land with the real
 * photography. What is here is the shape they slot into.
 */
export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const gallery = vehicle.gallery ?? [];
  const branch = populated(vehicle.branch);
  const colour = vehicle.exteriorColour;

  if (gallery.length === 0) {
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
    <div>
      {/* Real gallery lands with the photography. It mounts in the same 16:10 box, over the
          colour field, which stays underneath as the loading state and the letterbox fill. */}
      <div className="aspect-[16/10] bg-surface-sunken" />
    </div>
  );
}
