import { X } from "lucide-react";
import Link from "next/link";

import { formatKm, formatRand } from "@/lib/format";

import { CONDITIONS, hrefFor, rangeLabel, type SearchState, statePairs, yearLabel } from "./params";
import type { Resolved, Taxonomy } from "./stock";

export type Chip = { id: string; label: string; href: string };

/**
 * One removable chip per applied filter, each a link to the same search without it.
 *
 * Built from the search as it is applied, so a make the search box understood is a chip like a
 * make that was ticked, and removing either leaves the rest standing. The words typed into the
 * search box are not re-sent (see facet-rail.tsx for why), so a chip link never brings back what
 * the buyer just removed. A model chip reads "Toyota Hilux"; while a model is chosen its make is
 * not a separate chip, because removing the make would not change the result.
 */
export function buildChips(resolved: Resolved, taxonomy: Taxonomy, path = "/cars"): Chip[] {
  const base: SearchState = { ...resolved.effective, q: undefined };
  const { terms } = resolved;
  const href = (next: Partial<SearchState>) => hrefFor(path, statePairs({ ...base, ...next }));
  const chips: Chip[] = [];

  for (const make of terms.make) {
    if (terms.model.some((model) => model.make === make.id)) continue;
    chips.push({
      id: `make:${make.slug}`,
      label: make.name,
      href: href({ make: base.make.filter((slug) => slug !== make.slug) }),
    });
  }

  for (const model of terms.model) {
    const makeName = taxonomy.makes.find((make) => make.id === model.make)?.name;
    chips.push({
      id: `model:${model.slug}`,
      label: [makeName, model.name].filter(Boolean).join(" "),
      href: href({
        model: base.model.filter((slug) => slug !== model.slug),
        variant: terms.variant?.parent === model.id ? undefined : base.variant,
      }),
    });
  }

  if (terms.variant) {
    chips.push({ id: "variant", label: terms.variant.name, href: href({ variant: undefined }) });
  }

  const lists = [
    ["body", terms.body],
    ["fuel", terms.fuel],
    ["transmission", terms.transmission],
    ["province", terms.province],
  ] as const;
  for (const [key, list] of lists) {
    for (const term of list) {
      chips.push({
        id: `${key}:${term.slug}`,
        label: term.name,
        href: href({
          [key]: base[key].filter((slug) => slug !== term.slug),
        } as Partial<SearchState>),
      });
    }
  }

  if (terms.city) {
    chips.push({ id: "city", label: terms.city.name, href: href({ city: undefined }) });
  }
  if (terms.colour) {
    chips.push({
      id: "colour",
      label: `${terms.colour.name} paint`,
      href: href({ colour: undefined }),
    });
  }
  if (base.condition) {
    chips.push({
      id: "condition",
      label: CONDITIONS[base.condition],
      href: href({ condition: undefined }),
    });
  }

  const price = rangeLabel(base.minPrice, base.maxPrice, formatRand);
  if (price) {
    chips.push({
      id: "price",
      label: price,
      href: href({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  const year = yearLabel(base.minYear, base.maxYear);
  if (year) {
    chips.push({ id: "year", label: year, href: href({ minYear: undefined, maxYear: undefined }) });
  }
  if (base.maxMileage) {
    chips.push({
      id: "mileage",
      label: `Up to ${formatKm(base.maxMileage)}`,
      href: href({ maxMileage: undefined }),
    });
  }

  return chips;
}

/**
 * The chips row. It wraps beside the sort control on a desktop and scrolls sideways in one line on
 * a phone, so five filters cost one row of height rather than three above the first car.
 */
export function AppliedFilters({
  chips,
  clearHref = "/cars",
  className = "",
}: {
  chips: Chip[];
  clearHref?: string;
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <ul
      aria-label="Applied filters"
      className={`flex items-center gap-2 max-xl:-mx-[var(--container-pad)] max-xl:overflow-x-auto max-xl:overscroll-x-contain max-xl:px-[var(--container-pad)] max-xl:py-1 xl:flex-wrap ${className}`}
    >
      {chips.map((chip) => (
        <li key={chip.id} className="shrink-0">
          <Link
            href={chip.href}
            aria-label={`Remove ${chip.label}`}
            className="rn-chip gap-1.5 pe-2.5"
          >
            <span>{chip.label}</span>
            <X aria-hidden="true" className="size-4 text-muted" />
          </Link>
        </li>
      ))}
      <li className="shrink-0">
        <a
          href={clearHref}
          className="inline-flex min-h-9 items-center rounded-sm px-2 text-sm font-semibold text-accent underline-offset-4 hover:text-accent-hover hover:underline"
        >
          Clear all
        </a>
      </li>
    </ul>
  );
}
