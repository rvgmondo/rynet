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
 * the way down into the grid.
 *
 * `polite` rather than `assertive` on purpose. A result count is worth announcing at the
 * next natural pause, not worth interrupting whatever is being read.
 *
 * THE HONESTY CAPTION belongs here and nowhere else on this page. The colour fields are the
 * most obvious thing about the design and the first question anyone will ask about them, so
 * the answer is stated once, plainly, above the results. Saying it out loud is more
 * confident than hoping nobody asks, and it turns the platform's biggest gap into its most
 * self-assured line. Repeating it per card would make it noise.
 */
export function ResultsHeader({
  total,
  page,
  totalPages,
  sort,
  priceSummary,
  query,
  understood = [],
  ignored = [],
}: {
  total: number;
  page: number;
  totalPages: number;
  sort: string;
  priceSummary: string | null;
  /** What the buyer typed, if they arrived through the search box. */
  query?: string;
  /** The parts of it that resolved to a real filter. */
  understood?: string[];
  /** The parts that did not. Shown, never swallowed. */
  ignored?: string[];
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 id="results-heading" className="rn-head">
            Cars for sale
          </h1>
          <p aria-live="polite" className="mt-3 text-sm text-ink-secondary">
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

        {/* On a phone the rail sits below the results, so this is how a buyer reaches it. */}
        <a
          href="#filters-heading"
          className="rn-label inline-flex min-h-11 items-center text-ink-muted lg:hidden"
        >
          Filter
        </a>

        <form method="get" action="/cars" className="flex items-end gap-3">
          <div>
            <label htmlFor="sort" className="rn-label block text-ink-muted">
              Sort by
            </label>
            {/* A ruled line, not a box. Every control on this page is a line. */}
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="mt-2 min-h-11 border-0 border-b-2 border-line-interactive bg-transparent pe-6 text-sm font-medium"
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
            className="rn-label min-h-11 border border-line-interactive px-4 hover:bg-ink hover:text-ink-inverse"
          >
            Apply
          </button>
        </form>
      </div>

      {query ? (
        /*
         * What the search box actually did with the words, in the buyer's own words.
         *
         * A search that quietly drops half of what someone typed and returns 40 results is
         * worse than one that returns nothing, because the buyer has no way of knowing the
         * list they are scrolling is not the list they asked for.
         */
        <p className="mt-4 text-sm text-ink-secondary">
          Searched for <span className="font-medium text-ink">{query}</span>.
          {understood.length > 0 ? ` Read as: ${understood.join(", ")}.` : ""}
          {ignored.length > 0 ? (
            <span className="text-ink-muted">
              {" "}
              Nothing on the platform matches {ignored.join(" ")}, so it was left out.
            </span>
          ) : null}
        </p>
      ) : null}

      <hr className="rn-rule mt-6" />

      <p className="rn-label rn-label--light mt-3 text-ink-muted">
        Colour fields are each car's own recorded paint, set to one tone. Not photographs.
      </p>
    </div>
  );
}
