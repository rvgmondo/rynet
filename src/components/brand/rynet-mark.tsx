/**
 * The Rynet mark.
 *
 * A geometric reconstruction of the tachometer arc from the supplied logo: a segmented
 * sweep that runs silver through to brand red, with the needle at the top of the range.
 *
 * Two deliberate departures from the raster files in `brand/`:
 *
 * 1. **The wordmark is not in here.** It is set in Montserrat as real text beside this,
 *    so it stays crisp at any size, is selectable, is readable by a screen reader, and does
 *    not need a second asset for the dark lockup.
 *
 * 2. **The needle and the sweep are drawn, not traced.** The supplied files are PNGs. Tracing
 *    a raster produces bloated path data that looks soft at small sizes. The real vector
 *    source is listed in docs/CONTENT-NEEDED.md, and when it arrives this component is
 *    replaced by it rather than adjusted.
 *
 * `aria-hidden` throughout: wherever this appears it sits beside the word Rynet or inside a
 * link that already carries an accessible name, so announcing it again is noise.
 */
export function RynetMark({ className }: { className?: string }) {
  // Twelve segments across a 200 degree sweep, gapped, warming toward the top of the range.
  const segments = Array.from({ length: 12 }, (_, i) => {
    const start = 170 + i * (200 / 12);
    const end = start + 200 / 12 - 3.5;
    return { start, end, index: i };
  });

  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [32 + r * Math.cos(rad), 32 + r * Math.sin(rad)] as const;
  };

  const arc = (startDeg: number, endDeg: number, rOuter: number, rInner: number) => {
    const [x1, y1] = polar(startDeg, rOuter);
    const [x2, y2] = polar(endDeg, rOuter);
    const [x3, y3] = polar(endDeg, rInner);
    const [x4, y4] = polar(startDeg, rInner);
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
  };

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <title>Rynet</title>
      {segments.map(({ start, end, index }) => {
        // The sweep warms from silver into brand red across the range, the way a tacho
        // does. Both endpoints are brand values, so nothing here is an invented colour.
        const t = index / (segments.length - 1);
        const fill =
          t < 0.45
            ? "var(--rn-neutral-400)"
            : t < 0.62
              ? "var(--rn-red-200)"
              : t < 0.78
                ? "var(--rn-red-400)"
                : "var(--rn-red-500)";
        return (
          <path
            key={start}
            d={arc(start, end, 30, index < 6 ? 24 : 22)}
            fill={fill}
            opacity={t < 0.45 ? 0.85 : 1}
          />
        );
      })}

      {/* The needle, resting near the top of the range. */}
      <path d="M 31 33 L 45 15 L 47 17.5 L 33.5 35 Z" fill="var(--rn-red-500)" />
      <circle cx="32" cy="34" r="4.2" fill="var(--rn-neutral-400)" />
      <circle cx="32" cy="34" r="1.8" fill="var(--color-surface)" />
    </svg>
  );
}
