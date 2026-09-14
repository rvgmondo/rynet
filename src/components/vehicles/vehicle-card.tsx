import { BadgeCheck, CalendarDays, Camera, Fuel, Gauge, MapPin, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge, DemoListingBadge } from "@/components/ui/badge";
import { type KeyFact, KeyFacts } from "@/components/ui/key-facts";
import { PriceTag } from "@/components/ui/price-tag";
import { ColourPlate } from "@/components/vehicles/colour-plate";
import { formatKm, formatRand } from "@/lib/format";
import { vehicleUrl } from "@/lib/urls";
import type { VehiclePhoto } from "@/lib/vehicle-photo";

export type VehicleCardData = {
  publicRef: string;
  modelYear: number;
  makeName: string;
  makeSlug: string;
  modelName: string;
  modelSlug: string;
  variantName: string | null;
  price: number;
  previousPrice: number | null;
  mileageKm: number;
  transmissionName: string | null;
  fuelName: string | null;
  bodyName: string | null;
  condition: "new" | "demo" | "pre_owned";
  dealerName: string;
  dealerSlug: string;
  cityName: string | null;
  provinceName: string | null;
  isDemonstration: boolean;
  /** The listing's first photograph at the "card" rendition (see vehiclePhoto(vehicle, "card")). */
  photo: VehiclePhoto | null;
  /** The car's recorded paint colour. Used by the no-photograph state, and only there. */
  colourName: string | null;
  colourSwatch: string | null;
  colourFamily: string | null;
};

/**
 * Keep a model code such as "GD-6" or "1.5-litre" on one line. A hyphen is a break opportunity,
 * and the title used to break "GD- / 6 Raider" across the clamp. Only short tokens are glued, so a
 * long one can still wrap rather than push the card wider.
 */
function unbreakable(text: string) {
  let offset = 0;
  return text.split(" ").map((word) => {
    const start = offset;
    offset += word.length + 1;
    const glue = word.includes("-") && word.length <= 12;
    return (
      <span key={start}>
        {start > 0 ? " " : null}
        {glue ? <span className="whitespace-nowrap">{word}</span> : word}
      </span>
    );
  });
}

/**
 * A vehicle in a result grid.
 *
 * A white card with a 12px radius, a soft shadow and a small lift on hover. The photograph leads
 * at 16:10, the price is the strongest thing in the card, then the title, four key facts, and the
 * dealership and town on one line at the foot.
 *
 * DECISIONS THAT MUST SURVIVE ANY RESTYLE, each because a specific bug happened:
 *
 * 1. The whole card is not a link. The title is, and its ::after covers the card, so the card is
 *    one target without nesting controls, the accessible name is the title rather than a
 *    paragraph, and a buyer can still select the price to copy it.
 * 2. The title is clamped to two lines with a matching min-height, so rows never go ragged, and
 *    model codes do not break at their hyphen.
 * 3. `min-w-0` on the dealer name so `truncate` engages and the row never pushes the card past the
 *    viewport at 320px. The town never truncates; the name gives way first.
 * 4. Status is never colour alone. A price drop reads "Reduced by R 13 400" in words.
 *
 * HONESTY. A demonstration listing carries one "Demo listing" badge, always visible, on the
 * photograph. A demonstration dealership is never marked verified: the check beside the dealer
 * name only renders when `isDemonstration` is false, and a listing can only go live from a
 * verified dealership (enforced in the vehicles collection hook).
 *
 * PERFORMANCE. The photograph is the "card" rendition (640px), `sizes` tells the browser the
 * slot is at most a third of a desktop and the full width of a phone, and only the caller's
 * chosen card (`priority`) is preloaded: one priority image per page.
 */
export function VehicleCard({
  vehicle,
  priority = false,
}: {
  vehicle: VehicleCardData;
  /** Preload this card's photograph. Give it to the first card of the first grid only. */
  priority?: boolean;
  /** @deprecated Position is no longer used for anything. Kept so older call sites compile. */
  index?: number;
}) {
  const name = [vehicle.modelYear, vehicle.makeName, vehicle.modelName].filter(Boolean).join(" ");
  const dropAmount =
    vehicle.previousPrice && vehicle.previousPrice > vehicle.price
      ? vehicle.previousPrice - vehicle.price
      : null;

  const facts: KeyFact[] = [
    { icon: CalendarDays, label: "Year", value: String(vehicle.modelYear) },
    { icon: Gauge, label: "Mileage", value: formatKm(vehicle.mileageKm) },
    ...(vehicle.transmissionName
      ? [{ icon: Settings2, label: "Transmission", value: vehicle.transmissionName }]
      : []),
    ...(vehicle.fuelName ? [{ icon: Fuel, label: "Fuel", value: vehicle.fuelName }] : []),
  ];

  const conditionBadge =
    vehicle.condition === "new" ? "New" : vehicle.condition === "demo" ? "Ex-demo" : null;

  return (
    <article className="rn-card rn-card--interactive rn-vcard">
      <div className="rn-vcard__media">
        {vehicle.photo ? (
          <Image
            src={vehicle.photo.url}
            alt={vehicle.photo.alt}
            width={vehicle.photo.width}
            height={vehicle.photo.height}
            sizes="(min-width: 80rem) 300px, (min-width: 35rem) 50vw, 100vw"
            className="rn-vcard__img"
            priority={priority}
          />
        ) : (
          <ColourPlate
            colourSwatch={vehicle.colourSwatch}
            colourName={vehicle.colourName}
            className="h-full"
          />
        )}

        {vehicle.isDemonstration || conditionBadge ? (
          <div className="rn-vcard__badges">
            {vehicle.isDemonstration ? <DemoListingBadge onPhoto /> : null}
            {conditionBadge ? (
              <Badge tone="new" onPhoto>
                {conditionBadge}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {vehicle.photo && vehicle.photo.count > 1 ? (
          <p className="rn-vcard__count">
            <Camera aria-hidden="true" />
            <span aria-hidden="true">{vehicle.photo.count}</span>
            <span className="sr-only">{vehicle.photo.count} photographs</span>
          </p>
        ) : null}
      </div>

      <div className="rn-vcard__body">
        <div className="rn-vcard__price">
          <PriceTag value={vehicle.price} size="md" />
          {dropAmount ? (
            <Badge tone="drop">
              <span>
                Reduced by {formatRand(dropAmount)}
                <span className="sr-only"> from {formatRand(vehicle.previousPrice ?? 0)}</span>
              </span>
            </Badge>
          ) : null}
        </div>

        <h3 className="rn-vcard__title">
          <Link href={vehicleUrl(vehicle)} className="rn-vcard__link">
            {name}
            {vehicle.variantName ? (
              <span className="rn-vcard__variant"> {unbreakable(vehicle.variantName)}</span>
            ) : null}
          </Link>
        </h3>

        <KeyFacts items={facts} className="rn-vcard__facts" />

        <p className="rn-vcard__foot">
          {vehicle.isDemonstration ? null : (
            <BadgeCheck aria-hidden="true" className="text-success" />
          )}
          <span className="rn-vcard__dealer">
            {vehicle.isDemonstration ? null : (
              <span className="sr-only">Verified dealership: </span>
            )}
            {vehicle.dealerName}
          </span>
          {vehicle.cityName ? (
            <>
              <MapPin aria-hidden="true" className="ml-1" />
              <span className="rn-vcard__town">{vehicle.cityName}</span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
