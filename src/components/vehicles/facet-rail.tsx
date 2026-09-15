import { X } from "lucide-react";

import { FilterBehaviour } from "@/components/search/filter-behaviour";
import {
  CONDITIONS,
  type Condition,
  MILEAGE_STEPS,
  PRICE_STEPS,
  rangeLabel,
  type SearchState,
  withValue,
  yearLabel,
} from "@/components/search/params";
import type { SearchSet } from "@/components/search/stock";
import { buttonClasses } from "@/components/ui/button-classes";
import { Select } from "@/components/ui/field";
import { formatKm, formatRand } from "@/lib/format";

import { FacetGroup, type FacetOption, FilterSection, OptionList } from "./facet-group";

/**
 * The filters: a white sidebar at 1280px and up, a full-height sheet below it.
 *
 * ONE FORM, RENDERED ONCE. The same element is the sidebar and the sheet, so there is one set of
 * ids, one set of inputs and one submit. Below 1280px it is `display: none` until opened, which
 * takes every control out of the tab order and the accessibility tree; the "Filters" button opens
 * it with `:target` before hydration and as a modal dialog after (see FilterBehaviour).
 *
 * THE ORDER IS THE ORDER BUYERS DECIDE IN: price, make, model, body, year, mileage, gearbox, fuel,
 * province, then condition. Price used to be last, below four collapsed sections.
 *
 * A PLAIN GET FORM TO /cars. It works with JavaScript off. Everything the search holds that the
 * form does not draw as a control (a city, a paint colour, a variant, the sort order, and any
 * parameter this page does not know) rides along as a hidden input, so applying a filter never
 * silently drops what the buyer arrived with.
 *
 * The one deliberate exception is the search box's `q`. Whatever it understood is already drawn
 * here as ticked boxes, a price and a hidden city, so those are what the form submits; the words
 * themselves are not sent again. Sending them again would make the rail impossible to use: untick
 * the Toyota that "toyota hilux" produced, and the words would put it straight back.
 *
 * Counts are exact. Every option shows how many cars ticking it would leave with every OTHER filter
 * applied, computed in memory from the same rows the results come from (match.ts). A zero option is
 * disabled and keeps its 0, so the list does not jump and "none right now" reads differently from
 * "not a category". The landing pages use this too, posting to /cars with their own facet already
 * ticked, so a buyer who arrived on "Bakkies for sale" keeps the bakkie filter when they refine.
 */

const one = (n: number) => n.toLocaleString("en-ZA");

export function FacetRail({
  set,
  total,
  applied,
  action = "/cars",
  clearHref = "/cars",
  extra = [],
}: {
  set: Pick<SearchSet, "resolved" | "facets" | "taxonomy" | "rows">;
  /** Cars the current search matches, for the submit button before any count comes back. */
  total: number;
  /** How many filters are applied, which decides whether "Clear all" is offered. */
  applied: number;
  action?: string;
  clearHref?: string;
  /** Parameters this page does not understand, carried untouched. */
  extra?: [string, string][];
}) {
  const { resolved, facets, taxonomy, rows } = set;
  const state: SearchState = resolved.effective;

  // Only makes and models that exist in live stock are offered at all. A make with no cars on the
  // platform is not a filter; a make with cars that the other filters exclude shows a disabled 0.
  const stockedMakes = new Set(rows.map((row) => row.make));
  const stockedModels = new Set(rows.map((row) => row.model));

  const makeOptions: FacetOption[] = taxonomy.makes
    .filter((make) => (make.active && stockedMakes.has(make.id)) || state.make.includes(make.slug))
    .map((make) => ({
      label: make.name,
      value: make.slug,
      count: facets.make[make.id] ?? 0,
      checked: state.make.includes(make.slug),
    }));

  const modelGroups = taxonomy.makes
    .map((make) => {
      const models = taxonomy.models.filter(
        (model) =>
          model.make === make.id &&
          (stockedModels.has(model.id) || state.model.includes(model.slug)),
      );
      const options: FacetOption[] = models.map((model) => ({
        label: model.name,
        value: model.slug,
        count: facets.model[model.id] ?? 0,
        checked: state.model.includes(model.slug),
      }));
      const visible = state.make.includes(make.slug) || options.some((option) => option.checked);
      return { make, options, visible };
    })
    .filter((group) => group.options.length > 0);

  const anyModelsVisible = modelGroups.some((group) => group.visible);
  const chosenModels = modelGroups.flatMap((group) => group.options.filter((o) => o.checked));

  const listOf = (
    terms: { id: number; name: string; slug: string }[],
    counts: Record<number, number>,
    chosen: string[],
  ): FacetOption[] =>
    terms.map((term) => ({
      label: term.name,
      value: term.slug,
      count: counts[term.id] ?? 0,
      checked: chosen.includes(term.slug),
    }));

  const years = rows.map((row) => row.year).filter((year) => year > 0);
  const newest = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  const oldest = years.length > 0 ? Math.min(...years) : newest;
  const yearSteps: number[] = [];
  for (let year = newest; year >= oldest; year -= 1) yearSteps.push(year);
  // Newest first, which is how a buyer reads a year list. A year typed into the address that is
  // outside the stock range is added, so the select can still show what is applied.
  const yearFrom = [...withValue(yearSteps, state.minYear)].sort((a, b) => b - a);
  const yearTo = [...withValue(yearSteps, state.maxYear)].sort((a, b) => b - a);

  const mileageOptions: FacetOption[] = [
    { label: "Any mileage", value: "", count: 0, checked: !state.maxMileage },
    ...withValue(MILEAGE_STEPS, state.maxMileage).map((step) => ({
      label: `Up to ${formatKm(step)}`,
      value: String(step),
      // A ceiling typed into the address is not one of the counted steps, and it only appears
      // when it is the one applied, so the cars it leaves are the cars on the page.
      count: facets.mileage[step] ?? total,
      checked: state.maxMileage === step,
    })),
  ];

  const conditionOrder: Condition[] = ["pre_owned", "new", "demo"];
  const conditionOptions: FacetOption[] = [
    { label: "Any condition", value: "", count: 0, checked: !state.condition },
    ...conditionOrder.map((value) => ({
      label: CONDITIONS[value],
      value,
      count: facets.condition[value] ?? 0,
      checked: state.condition === value,
    })),
  ];

  // What the form does not draw, carried as it is. `data-needs-*` lets FilterBehaviour stop
  // sending a variant or a city once the model or province it belongs to has been unticked.
  const variantModel = resolved.terms.variant
    ? taxonomy.models.find((model) => model.id === resolved.terms.variant?.parent)?.slug
    : undefined;
  const cityProvince = resolved.terms.city
    ? taxonomy.provinces.find((province) => province.id === resolved.terms.city?.parent)?.slug
    : undefined;

  const hidden: { name: string; value: string; data?: Record<string, string> }[] = [];
  if (state.city) {
    hidden.push({
      name: "city",
      value: state.city,
      data: cityProvince ? { "data-needs-province": cityProvince } : undefined,
    });
  }
  if (state.colour) hidden.push({ name: "colour", value: state.colour });
  if (state.variant) {
    hidden.push({
      name: "variant",
      value: state.variant,
      data: variantModel ? { "data-needs-model": variantModel } : undefined,
    });
  }
  if (state.sort !== "newest") hidden.push({ name: "sort", value: state.sort });
  for (const [name, value] of extra) hidden.push({ name, value });

  const priceFrom = withValue(PRICE_STEPS, state.minPrice);
  const priceTo = withValue(PRICE_STEPS, state.maxPrice);
  const buttonLabel =
    total === 0 ? "No cars match" : `Show ${one(total)} ${total === 1 ? "car" : "cars"}`;

  return (
    <aside
      id="filters"
      aria-labelledby="filters-heading"
      className="fixed inset-0 z-[var(--z-modal)] hidden bg-[var(--rn-scrim)] target:flex data-[open]:flex data-[open]:animate-[rn-fade-in_var(--duration-element)_var(--rn-ease-out)_both] xl:static xl:z-auto xl:block xl:bg-transparent xl:target:block"
    >
      <div
        data-filter-sheet
        tabIndex={-1}
        className="flex h-full w-full flex-col bg-card shadow-overlay outline-none sm:max-w-[26rem] xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:h-auto xl:max-h-[calc(100dvh-var(--header-height)-3rem)] xl:max-w-none xl:overflow-hidden xl:rounded-lg xl:border xl:border-line xl:shadow-card"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2 ps-4 pe-2 xl:px-5 xl:py-4">
          <h2 id="filters-heading" className="text-lg font-semibold text-heading">
            Filters
          </h2>
          <a
            href="#results"
            data-filters-close
            aria-label="Close filters"
            className={buttonClasses({ variant: "ghost", size: "icon", className: "xl:hidden" })}
          >
            <X aria-hidden="true" />
          </a>
        </div>

        <form
          // A new search is a new form. Uncontrolled inputs keep what a hand last did to them, so
          // without this a chip removed by a soft navigation could leave its box still ticked.
          key={JSON.stringify(state)}
          method="get"
          action={action}
          data-filter-form
          className="flex min-h-0 flex-1 flex-col"
        >
          {hidden.map((input, index) => (
            <input
              key={`${input.name}:${input.value}:${index}`}
              type="hidden"
              name={input.name}
              value={input.value}
              {...input.data}
            />
          ))}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 xl:px-5">
            <FilterSection
              title="Price"
              summary={rangeLabel(state.minPrice, state.maxPrice, formatRand)}
              open
            >
              <fieldset>
                <legend className="sr-only">Price</legend>
                <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                  <label htmlFor="filter-min-price" className="text-sm font-medium text-body">
                    From
                  </label>
                  <Select id="filter-min-price" name="minPrice" defaultValue={state.minPrice ?? ""}>
                    <option value="">Any</option>
                    {priceFrom.map((value) => (
                      <option key={value} value={value}>
                        {formatRand(value)}
                      </option>
                    ))}
                  </Select>
                  <label htmlFor="filter-max-price" className="text-sm font-medium text-body">
                    To
                  </label>
                  <Select id="filter-max-price" name="maxPrice" defaultValue={state.maxPrice ?? ""}>
                    <option value="">Any</option>
                    {priceTo.map((value) => (
                      <option key={value} value={value}>
                        {formatRand(value)}
                      </option>
                    ))}
                  </Select>
                </div>
              </fieldset>
            </FilterSection>

            <FacetGroup
              title="Make"
              name="make"
              options={makeOptions}
              open
              limit={8}
              moreLabel={(n) => `Show ${n} more ${n === 1 ? "make" : "makes"}`}
            />

            <FilterSection
              title="Model"
              summary={
                chosenModels.length === 0
                  ? null
                  : chosenModels.length <= 2
                    ? chosenModels.map((option) => option.label).join(", ")
                    : `${chosenModels.length} selected`
              }
              open={anyModelsVisible}
            >
              <p data-models-empty hidden={anyModelsVisible} className="py-2 text-sm text-muted">
                Choose a make to see its models.
              </p>
              {modelGroups.map((group) => (
                <div
                  key={group.make.slug}
                  data-models-of={group.make.slug}
                  hidden={!group.visible}
                  className="pt-2"
                >
                  <p aria-hidden="true" className="text-xs font-semibold text-muted">
                    {group.make.name}
                  </p>
                  <OptionList
                    name="model"
                    options={group.options}
                    legend={`${group.make.name} models`}
                  />
                </div>
              ))}
            </FilterSection>

            <FacetGroup
              title="Body type"
              name="body"
              options={listOf(taxonomy.bodies, facets.body, state.body)}
              open
            />

            <FilterSection title="Year" summary={yearLabel(state.minYear, state.maxYear)}>
              <fieldset>
                <legend className="sr-only">Model year</legend>
                <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                  <label htmlFor="filter-min-year" className="text-sm font-medium text-body">
                    From
                  </label>
                  <Select id="filter-min-year" name="minYear" defaultValue={state.minYear ?? ""}>
                    <option value="">Any</option>
                    {yearFrom.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                  <label htmlFor="filter-max-year" className="text-sm font-medium text-body">
                    To
                  </label>
                  <Select id="filter-max-year" name="maxYear" defaultValue={state.maxYear ?? ""}>
                    <option value="">Any</option>
                    {yearTo.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>
              </fieldset>
            </FilterSection>

            <FacetGroup title="Mileage" name="maxMileage" type="radio" options={mileageOptions} />

            <FacetGroup
              title="Transmission"
              name="transmission"
              options={listOf(taxonomy.transmissions, facets.transmission, state.transmission)}
            />

            <FacetGroup
              title="Fuel"
              name="fuel"
              options={listOf(taxonomy.fuels, facets.fuel, state.fuel)}
            />

            <FacetGroup
              title="Province"
              name="province"
              options={listOf(taxonomy.provinces, facets.province, state.province)}
            />

            <FacetGroup
              title="Condition"
              name="condition"
              type="radio"
              options={conditionOptions}
            />
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-line bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] xl:px-5 xl:py-4">
            {applied > 0 ? (
              <a
                href={clearHref}
                className={buttonClasses({ variant: "outline", className: "shrink-0" })}
              >
                Clear all
              </a>
            ) : null}
            {/* Red in the sheet, where it is the only action on screen. Navy in the sidebar, which
                shares the viewport with the header's red "Sell your car": one red object a screen. */}
            <button
              type="submit"
              className={buttonClasses({
                variant: "primary",
                className:
                  "min-w-0 flex-1 xl:bg-secondary xl:text-on-secondary xl:hover:bg-secondary-hover",
              })}
            >
              <span data-count-label>{buttonLabel}</span>
            </button>
            <p data-count-status aria-live="polite" className="sr-only" />
          </div>
        </form>
      </div>

      <FilterBehaviour panelId="filters" />
    </aside>
  );
}
