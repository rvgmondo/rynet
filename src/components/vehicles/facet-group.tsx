import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Choice } from "@/components/ui/field";

export type FacetOption = {
  label: string;
  value: string;
  /** Cars this option would leave, with every other filter applied. */
  count: number;
  checked: boolean;
};

/**
 * One section of the filter panel: a native disclosure with a heading, a short summary of what
 * is chosen, and its controls.
 *
 * A `<details>`, so every section opens and closes with a keyboard and with no JavaScript, and a
 * closed section is out of the tab order. The summary line says what is set ("Toyota, Ford") so a
 * buyer can read the whole search with every section closed.
 */
export function FilterSection({
  title,
  summary,
  open = false,
  children,
}: {
  title: string;
  summary?: string | null;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-line last:border-b-0">
      <summary className="-mx-2 flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-sm px-2 py-2 hover:bg-subtle [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 text-base font-semibold text-heading">{title}</span>
        <span className="min-w-0 flex-1 truncate text-end text-sm text-muted">{summary}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pt-1 pb-5">{children}</div>
    </details>
  );
}

/** A column of options: checkboxes or radios, each a 44px row with its count on the right. */
export function OptionList({
  name,
  options,
  type = "checkbox",
  legend,
}: {
  name: string;
  options: FacetOption[];
  type?: "checkbox" | "radio";
  /** For assistive technology only: the section title is already on screen. */
  legend: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <ul className="grid">
        {options.map((option) => {
          // A ticked option is never disabled, even at 0: a disabled input is not submitted, and
          // disabling a ticked one would silently drop it on the next search.
          const disabled = option.count === 0 && !option.checked && option.value !== "";
          return (
            <li key={option.value || "any"}>
              <Choice
                type={type}
                name={name}
                value={option.value}
                defaultChecked={option.checked}
                disabled={disabled}
                label={option.label}
                trailing={option.value === "" ? undefined : option.count.toLocaleString("en-ZA")}
                className={`-mx-2 rounded-sm px-2 ${
                  disabled ? "cursor-not-allowed text-muted" : "hover:bg-subtle"
                }`}
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/**
 * A filter section holding a list of checkboxes (or radios) with a count beside each.
 *
 * Native inputs in a `<fieldset>`, so the whole panel submits as one GET form with JavaScript off
 * and a screen reader announces the group before forty names.
 *
 * An option that would leave no cars is disabled and still shows its 0, so the list does not jump
 * as filters change and a buyer can tell "nothing matches" from "this category does not exist".
 *
 * A long list shows its `limit` best-stocked options and tucks the rest into a nested disclosure,
 * both halves in the order they arrived (alphabetical for makes). A ticked option always stays in
 * view, so nothing that is set is ever hidden.
 */
export function FacetGroup({
  title,
  name,
  options,
  type = "checkbox",
  open = false,
  limit,
  moreLabel,
  children,
}: {
  title: string;
  name: string;
  options: FacetOption[];
  type?: "checkbox" | "radio";
  open?: boolean;
  /** Show only this many options before "Show more". */
  limit?: number;
  /** "Show 7 more makes". Receives the number hidden. */
  moreLabel?: (hidden: number) => string;
  /** Extra controls under the list. */
  children?: ReactNode;
}) {
  const chosen = options.filter((option) => option.checked && option.value);
  const summary =
    chosen.length === 0
      ? null
      : chosen.length <= 2
        ? chosen.map((option) => option.label).join(", ")
        : `${chosen.length} selected`;

  let shown = options;
  let rest: FacetOption[] = [];
  if (limit && options.length > limit + 2) {
    const best = new Set(
      [...options]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((option) => option.value),
    );
    shown = options.filter((option) => best.has(option.value) || option.checked);
    rest = options.filter((option) => !best.has(option.value) && !option.checked);
  }

  return (
    <FilterSection title={title} summary={summary} open={open || chosen.length > 0}>
      <OptionList name={name} options={shown} type={type} legend={title} />
      {rest.length > 0 ? (
        <details className="group/more">
          <summary className="mt-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-semibold text-accent hover:text-accent-hover [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">
              {moreLabel ? moreLabel(rest.length) : `Show ${rest.length} more`}
            </span>
            <span className="hidden group-open/more:inline">Show fewer</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-[var(--duration-micro)] group-open/more:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <OptionList name={name} options={rest} type={type} legend={`More: ${title}`} />
        </details>
      ) : null}
      {children}
    </FilterSection>
  );
}
