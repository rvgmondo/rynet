const SORT_OPTIONS = [
  { value: "newest", label: "Newest listed" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "mileage", label: "Lowest mileage" },
  { value: "year", label: "Newest model year" },
] as const;

/**
 * The heading above a result set.
 *
 * The count sits in an `aria-live="polite"` region. When a buyer changes a filter the
 * number changes, and without a live region a screen reader user gets no indication that
 * anything happened at all: the page looks identical from the keyboard until they tab all
 * the way down into the grid. Section 12 asks for this specifically.
 *
 * `polite` rather than `assertive` on purpose. A result count is worth announcing at the
 * next natural pause, not worth interrupting whatever is being read.
 */
export function ResultsHeader({
  total,
  page,
  totalPages,
  sort,
  priceSummary,
}: {
  total: number;
  page: number;
  totalPages: number;
  sort: string;
  priceSummary: string | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 id="results-heading" className="text-2xl">
          Cars for sale
        </h1>
        <p aria-live="polite" className="mt-1 text-sm text-ink-secondary">
          <span className="font-semibold tabular text-ink">{total.toLocaleString("en-ZA")}</span>{" "}
          {total === 1 ? "car" : "cars"} from verified dealerships
          {totalPages > 1 ? (
            <span className="text-ink-muted">
              {" "}
              on page <span className="tabular">{page}</span> of{" "}
              <span className="tabular">{totalPages}</span>
            </span>
          ) : null}
        </p>
        {priceSummary ? (
          <p className="mt-0.5 text-xs text-ink-muted tabular">{priceSummary}</p>
        ) : null}
      </div>

      <form method="get" action="/cars" className="flex items-end gap-2">
        <div>
          <label htmlFor="sort" className="block text-xs font-medium text-ink-secondary">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="mt-1 min-h-11 rounded-md border border-line-interactive bg-surface px-3 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {/* Works without JavaScript. An onChange handler is added on top, not instead. */}
        <button
          type="submit"
          className="min-h-11 rounded-md border border-line-interactive px-3 text-sm font-semibold hover:bg-surface-sunken"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
