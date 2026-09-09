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
  demonstrationCount = 0,
  filters = [],
  widened = null,
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
  /** How many of these results are seeded example stock rather than cars for sale. */
  demonstrationCount?: number;
  /** Everything the buyer arrived with, so sorting does not throw their filters away. */
  filters?: { key: string; value: string }[];
  /** Set when a city had no stock and the search widened to its province. */
  widened?: { from: string; to: string } | null;
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
          {/*
            A GET form submits only its own controls. Without these, choosing a sort order
            discarded the search term and every ticked facet and dropped the buyer back into
            the full catalogue, which is the same bug the facet rail had.
          */}
          {filters.map((filter) => (
            <input key={filter.key} type="hidden" name={filter.key} value={filter.value} />
          ))}

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

      {widened ? (
        /*
         * A widened search says so.
         *
         * Nothing is registered in Cape Town, Durban or Johannesburg, because the branches
         * are in Bellville, Pinetown and Sandton, so a search for the three biggest cities
         * in the country returned nothing while the province held dozens of cars. It widens
         * by one step now, and telling the buyer is the whole point: showing George to
         * somebody who asked for Cape Town without a word would be worse than showing
         * nothing.
         */
        <p className="mt-4 border-y border-line py-3 text-sm text-ink-secondary">
          <strong className="font-semibold text-ink">
            No dealership has stock in {widened.from}.
          </strong>{" "}
          {/* "across Western Cape" rather than "in the Western Cape": four of the nine
              provinces take a definite article and five do not, and phrasing around it is
              cheaper and reads better than a table of exceptions. */}
          These are the cars across {widened.to}.
        </p>
      ) : null}

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

      {/*
        Said once, at the top, where a person reads before they scroll.
        ---------------------------------------------------------------
        Every listing here is currently seeded example stock, and until this line existed the
        only sign of that on a results page was a hairline under a dealer name. A page headed
        "311 cars from verified dealerships" with nothing to correct it is a fabricated claim,
        whatever the individual cards do. It disappears on its own once real stock outnumbers
        the seed.
      */}
      {demonstrationCount > 0 ? (
        <p className="mt-3 border-y border-line py-3 text-sm text-ink-secondary">
          <strong className="font-semibold text-ink">
            {demonstrationCount === total ? "Every listing here is an example." : null}
            {demonstrationCount !== total
              ? `${demonstrationCount} of these listings are examples.`
              : null}
          </strong>{" "}
          They were seeded to build and test the platform. The cars are not for sale and the
          dealerships are not real businesses. Every one is marked on its own card.
        </p>
      ) : null}

      <p className="rn-label rn-label--light mt-3 text-ink-muted">
        Colour fields are each car's own recorded paint, set to one tone. Not photographs.
      </p>
    </div>
  );
}
