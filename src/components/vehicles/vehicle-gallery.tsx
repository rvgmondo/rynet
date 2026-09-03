import { Camera } from "lucide-react";

import type { Vehicle } from "@/payload-types";

/**
 * The gallery.
 *
 * There is no vehicle photography yet, so this renders an honest empty state rather than a
 * grey rectangle pretending to be a photo. A placeholder that looks like a broken image is
 * worse than a panel that says plainly there are no photos: the first makes a buyer think
 * the site is broken, the second makes them ask the dealership.
 *
 * The lightbox, thumbnail strip, keyboard navigation and 360 tab land with the real
 * photography. What is here is the shape they slot into, so the page does not get rebuilt
 * around them later.
 */
export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const gallery = vehicle.gallery ?? [];

  if (gallery.length === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-lg border border-line bg-surface-sunken p-8 text-center">
        <Camera aria-hidden="true" className="size-8 text-ink-muted" />
        <p className="mt-3 font-display text-base font-bold">No photos on this listing yet</p>
        <p className="measure mt-1 text-sm text-ink-secondary">
          The dealership has not uploaded photographs. Everything below is from the vehicle record,
          and they can send you photos if you enquire.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {/* Real gallery lands with the photography. */}
      <div className="aspect-[16/10] bg-surface-sunken" />
    </div>
  );
}
