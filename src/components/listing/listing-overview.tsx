import {
  CalendarDays,
  CarFront,
  Check,
  Cog,
  Fuel,
  Gauge,
  Palette,
  Settings2,
  Waypoints,
} from "lucide-react";

import { type KeyFact, KeyFacts } from "@/components/ui/key-facts";
import { formatCc, formatKm } from "@/lib/format";
import { relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

/**
 * Key facts: the eight things a buyer checks before anything else, as an icon grid.
 *
 * Every value comes from the record, and a fact the dealership did not supply is left out rather
 * than drawn as a dash. On a phone this sits straight after the price and the contact buttons; on
 * a desktop it sits under the gallery while the summary card stays in view beside it.
 */
export function KeyFactsPanel({ vehicle }: { vehicle: Vehicle }) {
  const candidates: (KeyFact | null)[] = [
    { icon: CalendarDays, label: "Year", value: String(vehicle.modelYear) },
    { icon: Gauge, label: "Mileage", value: formatKm(vehicle.mileageKm) },
    fact(Settings2, "Transmission", relName(vehicle.transmission)),
    fact(Fuel, "Fuel", relName(vehicle.fuelType)),
    fact(Cog, "Engine", vehicle.engineCapacityCc ? formatCc(vehicle.engineCapacityCc) : null),
    fact(Waypoints, "Drive", relName(vehicle.drivetrain)),
    fact(CarFront, "Body", relName(vehicle.bodyType)),
    fact(Palette, "Colour", relName(vehicle.exteriorColour)),
  ];
  const items = candidates.filter((item): item is KeyFact => item !== null);

  return (
    <section aria-labelledby="facts-heading" className="rn-panel p-5 sm:p-8">
      <h2 id="facts-heading" className="text-xl font-bold text-heading">
        Key facts
      </h2>
      <KeyFacts
        items={items}
        variant="grid"
        className="mt-5 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-x-6"
      />
    </section>
  );
}

function fact(icon: KeyFact["icon"], label: string, value: string | null): KeyFact | null {
  return value ? { icon, label, value } : null;
}

/**
 * The equipment list.
 *
 * Two columns from the smallest phone, because a single column of thirteen short rows ran a full
 * screen. The first eight show; the rest sit behind a native disclosure, so the list stays short
 * without hiding anything from a buyer who wants it all, and it works with no JavaScript.
 *
 * The check marks and the disclosure are ink, not red. Red is spent on the one action on the page.
 */
const VISIBLE_FEATURES = 8;

export function FeaturesPanel({ vehicle }: { vehicle: Vehicle }) {
  const features = (vehicle.features ?? [])
    .map((feature) => relName(feature))
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "en-ZA"));

  if (features.length === 0) return null;

  const first = features.slice(0, VISIBLE_FEATURES);
  const rest = features.slice(VISIBLE_FEATURES);

  return (
    <section aria-labelledby="features-heading" className="rn-panel p-5 sm:p-8">
      <h2 id="features-heading" className="text-xl font-bold text-heading">
        Features
      </h2>
      <FeatureList items={first} className="mt-5" />
      {rest.length > 0 ? (
        <details className="group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-semibold text-heading underline underline-offset-3 hover:text-accent [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show all {features.length} features</span>
            <span className="hidden group-open:inline">Show fewer features</span>
          </summary>
          <FeatureList items={rest} className="mt-2" />
        </details>
      ) : null}
    </section>
  );
}

function FeatureList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-body lg:grid-cols-3 ${className}`}
    >
      {items.map((feature) => (
        <li key={feature} className="flex min-w-0 items-start gap-2">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-heading" />
          <span className="min-w-0">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
