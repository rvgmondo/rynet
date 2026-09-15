import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { type KeyFact, KeyFacts } from "@/components/ui/key-facts";
import { formatCc, formatKm } from "@/lib/format";
import { relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

type Row = { label: string; value: string | null };
type Group = { title: string; rows: Row[] };

const SERVICE_HISTORY: Record<string, string> = {
  full_franchise: "Full franchise service history",
  full_independent: "Full independent service history",
  partial: "Partial service history",
  none: "No service history",
  unknown: "Not known",
};

const ROADWORTHY: Record<string, string> = {
  current: "Current",
  expired: "Expired",
  not_required: "Not required",
  unknown: "Not known",
};

const CONDITION: Record<string, string> = {
  new: "New",
  demo: "Ex-demo",
  pre_owned: "Pre-owned",
};

const numberWithUnit = (value: number | null | undefined, unit: string) =>
  typeof value === "number"
    ? `${value.toLocaleString("en-ZA").replace(/[, ]/g, " ")} ${unit}`
    : null;

const longDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

/**
 * Key facts and the specification, in one panel.
 *
 * The eight headline facts lead as an icon grid, and the full specification follows under its own
 * heading as accordions. They used to be two separate white cards of equal weight, and with
 * Features and Finance the listing was a stack of four identical panels.
 *
 * Native `details`, so every group opens before hydration, with the keyboard, and with scripting
 * off. The group a buyer checks first, history and paperwork, leads and is open; the basics and
 * the drivetrain are one press away because the key facts above already carry the headline of
 * each. Whichever group actually has rows first is the one that opens, so a listing without
 * paperwork details still opens on something.
 *
 * No row counts beside the titles. "The basics 8" read as data and told a buyer nothing.
 *
 * Rows with no value are dropped rather than drawn with a dash. A column of dashes reads as a site
 * that lost the data, when the truth is the dealership never supplied it.
 *
 * `dl`, not `table`: name and value pairs about one car, so a screen reader hears
 * "Mileage, 24 800 km" rather than a column header for every cell. Each row carries its own top
 * rule, so a group with an odd number of rows ends cleanly in two columns instead of leaving a
 * half row with a rule under one side.
 */
export function SpecTable({ vehicle, facts = [] }: { vehicle: Vehicle; facts?: KeyFact[] }) {
  const groups: Group[] = [
    {
      title: "History and paperwork",
      rows: [
        {
          label: "Service history",
          value: vehicle.serviceHistory ? (SERVICE_HISTORY[vehicle.serviceHistory] ?? null) : null,
        },
        {
          label: "Roadworthy certificate",
          value: vehicle.roadworthy ? (ROADWORTHY[vehicle.roadworthy] ?? null) : null,
        },
        { label: "Licence expires", value: longDate(vehicle.licenceExpiry) },
        {
          label: "Warranty remaining",
          value: vehicle.warrantyRemaining?.months
            ? `${vehicle.warrantyRemaining.months} months${
                vehicle.warrantyRemaining.km ? ` or ${formatKm(vehicle.warrantyRemaining.km)}` : ""
              }`
            : null,
        },
        {
          label: "Registration year",
          value: vehicle.registrationYear ? String(vehicle.registrationYear) : null,
        },
      ],
    },
    {
      title: "The basics",
      rows: [
        { label: "Condition", value: CONDITION[vehicle.condition] ?? null },
        { label: "Model year", value: vehicle.modelYear ? String(vehicle.modelYear) : null },
        { label: "Mileage", value: formatKm(vehicle.mileageKm) },
        { label: "Body type", value: relName(vehicle.bodyType) },
        { label: "Exterior colour", value: relName(vehicle.exteriorColour) },
        { label: "Interior colour", value: relName(vehicle.interiorColour) },
        { label: "Doors", value: vehicle.doors ? String(vehicle.doors) : null },
        { label: "Seats", value: vehicle.seats ? String(vehicle.seats) : null },
      ],
    },
    {
      title: "Engine and drivetrain",
      rows: [
        { label: "Fuel", value: relName(vehicle.fuelType) },
        { label: "Transmission", value: relName(vehicle.transmission) },
        { label: "Drive", value: relName(vehicle.drivetrain) },
        {
          label: "Engine capacity",
          value: vehicle.engineCapacityCc ? formatCc(vehicle.engineCapacityCc) : null,
        },
        { label: "Cylinders", value: vehicle.cylinders ? String(vehicle.cylinders) : null },
        { label: "Power", value: numberWithUnit(vehicle.powerKw, "kW") },
        { label: "Torque", value: numberWithUnit(vehicle.torqueNm, "Nm") },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.value !== null && row.value !== ""),
    }))
    .filter((group) => group.rows.length > 0);

  const listed = longDate(vehicle.publishedAt);

  return (
    <section
      aria-labelledby={facts.length > 0 ? "facts-heading" : "spec-heading"}
      className="rn-panel p-5 sm:p-8"
    >
      {facts.length > 0 ? (
        <>
          <h2 id="facts-heading" className="text-xl font-bold text-heading">
            Key facts
          </h2>
          <KeyFacts
            items={facts}
            variant="grid"
            className="mt-5 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-x-6"
          />
        </>
      ) : null}

      {facts.length > 0 ? (
        <h3
          id="spec-heading"
          className="mt-8 border-t border-line pt-6 text-lg font-semibold text-heading"
        >
          Specification
        </h3>
      ) : (
        <h2 id="spec-heading" className="text-xl font-bold text-heading">
          Specification
        </h2>
      )}

      {groups.length > 0 ? (
        <div className="mt-2">
          {groups.map((group, index) => (
            <details
              key={group.title}
              open={index === 0}
              className="group border-b border-line last:border-b-0"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-3 text-base font-semibold text-heading [&::-webkit-details-marker]:hidden">
                {group.title}
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-heading transition-colors duration-[var(--duration-micro)] group-hover:bg-subtle-hover"
                >
                  <ChevronDown className="size-4 transition-transform duration-[var(--duration-element)] group-open:rotate-180" />
                </span>
              </summary>
              <dl className="grid gap-x-10 pb-5 text-sm sm:grid-cols-2">
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-t border-line py-3"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="text-right font-semibold text-heading tabular">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      ) : null}

      {/*
        The listing's own identifiers, at the foot of the specification rather than between the
        contact buttons and the dealership, where they used to take the most valuable space on
        the page. A buyer quotes the reference on the phone; nobody decides on it.
      */}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4 text-xs text-muted">
        {vehicle.publicRef ? (
          <div className="flex gap-1.5">
            <dt>Rynet reference</dt>
            <dd className="font-semibold text-body tabular">{vehicle.publicRef}</dd>
          </div>
        ) : null}
        {vehicle.stockNumber ? (
          <div className="flex gap-1.5">
            <dt>Dealer stock number</dt>
            <dd className="font-semibold text-body tabular">{vehicle.stockNumber}</dd>
          </div>
        ) : null}
        {listed ? (
          <div className="flex gap-1.5">
            <dt>Listed</dt>
            <dd className="font-semibold text-body">{listed}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Something wrong with this listing?{" "}
        <Link href="/contact" className="font-medium text-body underline underline-offset-3">
          Tell us
        </Link>{" "}
        and quote the Rynet reference.
      </p>
    </section>
  );
}
