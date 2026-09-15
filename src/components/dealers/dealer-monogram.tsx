/**
 * A dealership's monogram: its initials on a navy tile.
 *
 * It stands in for a logo, and on purpose it looks like nothing else. The seeded dealerships
 * are invented and have no logos, and drawing one would be fabricating a brand. When a real
 * dealership uploads its own logo, that replaces this.
 *
 * Decorative: it always sits beside the dealership's name, which carries the meaning.
 */

const SKIP = new Set(["and", "the", "of", "&"]);

/** "Bay Auto Traders" becomes "BA"; "The Car Place" becomes "CP". */
export function monogramInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word && !SKIP.has(word.toLowerCase()));
  const letters = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "R";
}

const SIZE = {
  sm: "size-11 rounded-sm text-base",
  md: "size-14 rounded-md text-xl",
  lg: "size-16 rounded-md text-2xl sm:size-20 sm:text-[1.75rem]",
} as const;

export function DealerMonogram({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden bg-secondary font-bold tracking-[-0.02em] text-on-secondary shadow-xs select-none ${SIZE[size]} ${className}`}
    >
      {monogramInitials(name)}
      {/* A hairline of brand red along the foot of the tile, the one nod to the gauge. */}
      <span className="absolute inset-x-0 bottom-0 h-1 bg-brand-red" />
    </span>
  );
}
