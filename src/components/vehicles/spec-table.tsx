import { formatCc, formatKm } from "@/lib/format";
import { relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

type Row = { label: string; value: string | null };

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
  demo: "Demo",
  pre_owned: "Pre-owned",
};

/**
 * The specification.
 *
 * Grouped and collapsible per Section 6, using `details` so it works before hydration and
 * with the keyboard for free. The first two groups are open by default because they carry
 * what a buyer decides on; the rest are one press away.
 *
 * Rows with no value are dropped rather than rendered with a dash. A table of dashes reads
 * as a site that has lost the data, when the truth is the dealership never supplied it, and
 * the honest way to say that is to say nothing.
 *
 * `dl` rather than `table`: this is a set of name and value pairs about one thing, not a
 * grid comparing several. A screen reader announces "Mileage, 147 200 km" rather than
 * reading a table header for every cell.
 */
function Group({
  title,
  rows,
  defaultOpen = false,
}: {
  title: string;
  rows: Row[];
  defaultOpen?: boolean;
}) {
  const present = rows.filter((row) => row.value !== null && row.value !== "");
  if (present.length === 0) return null;

  return (
    <details open={defaultOpen} className="group border-b border-line">
      {/*
        A disclosure that says it is one.
        ---------------------------------
        The marker was removed and nothing replaced it, so "History and paperwork" rendered as a
        bold line with a number beside it and gave no sign at all that it opened. On a page where
        three of the four spec groups are open by default, the one that is closed is the one
        nobody could tell was closed.

        A plus that becomes a minus, set in the label face at the right edge beside the count,
        with the ink flip the rest of the site uses for an interactive row. `list-style: none`
        on the summary is what takes the native triangle off in every engine.
      */}
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-1 font-display text-base font-bold transition-colors duration-[var(--duration-micro)] [&::-webkit-details-marker]:hidden [&::marker]:content-[''] hover:bg-ink hover:text-ink-inverse">
        {title}
        <span className="flex items-center gap-3">
          <span className="rn-label text-ink-muted group-hover:text-ink-inverse">
            {present.length}
          </span>
          <span aria-hidden="true" className="rn-label w-3 text-center">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">-</span>
          </span>
        </span>
      </summary>
      <dl className="grid gap-x-8 gap-y-0 pb-4 sm:grid-cols-2">
        {present.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0"
          >
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="text-right font-medium tabular">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function SpecTable({ vehicle }: { vehicle: Vehicle }) {
  const num = (value: number | null | undefined, unit: string) =>
    typeof value === "number"
      ? `${value.toLocaleString("en-ZA").replace(/[, ]/g, " ")} ${unit}`
      : null;

  const features = (vehicle.features ?? [])
    .map((f) => relName(f))
    .filter((n): n is string => Boolean(n))
    .sort();

  return (
    <section aria-labelledby="spec-heading">
      <h2 id="spec-heading" className="text-2xl">
        Specification
      </h2>

      <div className="mt-4">
        <Group
          title="The basics"
          defaultOpen
          rows={[
            { label: "Condition", value: CONDITION[vehicle.condition] ?? null },
            { label: "Model year", value: vehicle.modelYear ? String(vehicle.modelYear) : null },
            {
              label: "Registration year",
              value: vehicle.registrationYear ? String(vehicle.registrationYear) : null,
            },
            { label: "Mileage", value: formatKm(vehicle.mileageKm) },
            { label: "Body type", value: relName(vehicle.bodyType) },
            { label: "Colour", value: relName(vehicle.exteriorColour) },
            { label: "Interior", value: relName(vehicle.interiorColour) },
            { label: "Doors", value: vehicle.doors ? String(vehicle.doors) : null },
            { label: "Seats", value: vehicle.seats ? String(vehicle.seats) : null },
          ]}
        />

        <Group
          title="Engine and drivetrain"
          defaultOpen
          rows={[
            { label: "Fuel", value: relName(vehicle.fuelType) },
            { label: "Transmission", value: relName(vehicle.transmission) },
            { label: "Drivetrain", value: relName(vehicle.drivetrain) },
            {
              label: "Engine",
              value: vehicle.engineCapacityCc ? formatCc(vehicle.engineCapacityCc) : null,
            },
            { label: "Cylinders", value: vehicle.cylinders ? String(vehicle.cylinders) : null },
            { label: "Power", value: num(vehicle.powerKw, "kW") },
            { label: "Torque", value: num(vehicle.torqueNm, "Nm") },
          ]}
        />

        <Group
          title="History and paperwork"
          rows={[
            {
              label: "Service history",
              value: vehicle.serviceHistory
                ? (SERVICE_HISTORY[vehicle.serviceHistory] ?? null)
                : null,
            },
            {
              label: "Roadworthy",
              value: vehicle.roadworthy ? (ROADWORTHY[vehicle.roadworthy] ?? null) : null,
            },
            {
              label: "Licence expires",
              value: vehicle.licenceExpiry
                ? new Date(vehicle.licenceExpiry).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null,
            },
            {
              label: "Warranty remaining",
              value: vehicle.warrantyRemaining?.months
                ? `${vehicle.warrantyRemaining.months} months${
                    vehicle.warrantyRemaining.km
                      ? ` or ${formatKm(vehicle.warrantyRemaining.km)}`
                      : ""
                  }`
                : null,
            },
          ]}
        />
      </div>

      {features.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-lg">Features</h3>
          <ul className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 py-1">
                {/*
                  A rule, not a red tick.

                  There were thirteen of these on one vehicle page, every one of them red, in
                  a system whose rule is one red object per viewport. Red used thirteen times
                  on a features list is not emphasis, it is decoration, and it spends the
                  colour that has to mean "this is the action" further down the page. The
                  feature being listed IS the information, so the mark carries none and is
                  hidden from a screen reader either way.
                */}
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] h-px w-3 shrink-0 bg-current opacity-40"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
