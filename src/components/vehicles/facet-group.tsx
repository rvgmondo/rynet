type Option = { label: string; value: string; count: number };

/**
 * One facet dimension.
 *
 * Radio inputs rather than links, so the whole rail submits as one form and works with
 * JavaScript disabled. A native `<fieldset>` with a `<legend>` means a screen reader
 * announces "Make, group" before the options, which is the context that makes a list of
 * forty manufacturer names navigable.
 *
 * `count === -1` means "not counted", used where counting would cost more than it is worth
 * on this render. It shows no number rather than showing a wrong one.
 */
export function FacetGroup({
  legend,
  name,
  options,
  active,
  defaultOpen = false,
}: {
  legend: string;
  name: string;
  options: Option[];
  active?: string;
  defaultOpen?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <details open={defaultOpen || Boolean(active)} className="border-t border-line">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between py-2 font-display text-sm font-bold">
        {legend}
        {active ? <span className="text-xs font-medium text-accent">1 selected</span> : null}
      </summary>

      <fieldset className="pb-3">
        <legend className="sr-only">{legend}</legend>
        <ul className="max-h-64 space-y-0 overflow-y-auto">
          {options.map((option) => {
            const id = `${name}-${option.value}`;
            const disabled = option.count === 0;
            return (
              <li key={option.value}>
                <label
                  htmlFor={id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm ${
                    disabled ? "cursor-not-allowed text-ink-muted" : "hover:bg-surface-sunken"
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={name}
                    value={option.value}
                    defaultChecked={active === option.value}
                    disabled={disabled}
                    className="size-4 shrink-0 accent-[var(--color-accent-solid)]"
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                  {/*
                    Zero-count options are disabled and still show the count, per Section 6.
                    Hiding them makes the list jump as you filter and leaves a buyer unable
                    to tell "nothing matches" apart from "we do not have this category".
                  */}
                  {option.count >= 0 ? (
                    <span className="tabular text-xs text-ink-muted">{option.count}</span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </details>
  );
}
