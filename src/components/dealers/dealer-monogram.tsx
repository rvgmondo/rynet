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

/**
 * The dealership's own logo where it has uploaded one, on a white tile the size of the monogram
 * so the two line up wherever they appear. The original file, not a rendition: every rendition
 * is cropped to 4:3, which cuts a square or tall logo, and logos are small files. Anything else
 * falls back to the monogram.
 */
export function logoOf(logo: unknown): string | null {
  if (!logo || typeof logo !== "object") return null;
  const url = (logo as { url?: unknown }).url;
  return typeof url === "string" && url ? url : null;
}

export function DealerMonogram({
  name,
  size = "md",
  className = "",
  logo = null,
}: {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
  /** The populated `logo` relation of a dealership, or its URL. */
  logo?: unknown;
}) {
  const logoUrl = typeof logo === "string" ? logo : logoOf(logo);
  if (logoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: a small original file shown at a fixed tile size.
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`shrink-0 border border-line bg-white object-contain p-0.5 shadow-xs ${SIZE[size]} ${className}`}
      />
    );
  }

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
