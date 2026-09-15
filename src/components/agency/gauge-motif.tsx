/**
 * The gauge from the Rynet mark, drawn large and faint as a background for navy bands.
 *
 * Decorative only: hidden from assistive technology, never interactive, and clipped by its
 * parent (which must be `relative overflow-hidden`), so it can never cause a sideways scroll.
 * Colours come from tokens through Tailwind stroke utilities, so it holds in both themes.
 */
export function GaugeMotif({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 400"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
    >
      {/* The dial: a 270 degree arc, open at the bottom like the one in the mark. */}
      <path
        d="M72.7 327.3A180 180 0 1 1 327.3 327.3"
        className="stroke-line-on-navy"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M101 299A140 140 0 1 1 299 299"
        className="stroke-line-on-navy"
        strokeWidth="10"
        strokeDasharray="2 14"
      />
      {/* The last quarter of the dial in brand red, the way the mark runs navy into red. */}
      <path
        d="M380 200A180 180 0 0 1 327.3 327.3"
        className="stroke-brand-red"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M200 200L318 132"
        className="stroke-brand-red"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="200" cy="200" r="7" className="fill-brand-red" />
    </svg>
  );
}
