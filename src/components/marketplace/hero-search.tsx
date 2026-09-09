/**
 * The search, and it is a ruled line rather than a box.
 *
 * A plain GET form to /cars, server rendered, working with JavaScript off. The result is an
 * ordinary faceted URL, so what a buyer searches is shareable, restorable and crawlable,
 * and identical to what the filter rail would have produced.
 *
 * The submit is the only filled red object above the fold on the whole site, which is what
 * makes it the place the eye goes after the headline. See the red rule in tokens.css: one
 * red object per viewport, or red stops meaning anything.
 *
 * The placeholder is not decoration. "bakkie under 300" is a query this genuinely
 * understands, because every taxonomy carries the aliases South Africans actually type. See
 * src/lib/query-parse.ts.
 */
export function HeroSearch({ className = "" }: { className?: string }) {
  return (
    <form method="get" action="/cars" className={`flex items-stretch ${className}`}>
      <label htmlFor="hero-q" className="sr-only">
        Search cars by make, model, body type, town or price
      </label>
      <input
        id="hero-q"
        name="q"
        type="search"
        autoComplete="off"
        placeholder='Make, model, or "bakkie under 300"'
        className="h-16 min-w-0 flex-1 border-0 border-b-2 border-line-interactive bg-transparent px-0 text-lead font-medium text-ink placeholder:text-ink-muted sm:h-22"
      />
      <button
        type="submit"
        className="flex h-16 w-16 shrink-0 items-center justify-center bg-accent-solid text-ink-on-accent hover:bg-accent-solid-hover sm:h-22 sm:w-22"
      >
        <span className="sr-only">Search</span>
        {/* Drawn rather than imported. One glyph, six lines, no icon package on the critical
            path of the most requested page on the site. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
        >
          <title>Search</title>
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
