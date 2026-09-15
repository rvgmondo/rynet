import type { LucideIcon } from "lucide-react";

/**
 * IconTile: the one icon tile. A 44px rounded square on the tinted ground with the icon in heading
 * ink, 48px with `size="lg"` for a feature card, and raised navy inside an `.on-navy` band.
 * Decorative: the heading beside it carries the meaning.
 *
 *   <IconTile icon={Mail} />
 *
 * Styling is `.rn-icon-tile` in globals.css; markup that maps over icons can put the class on its
 * own <span> instead.
 */
export function IconTile({
  icon: Icon,
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`rn-icon-tile ${size === "lg" ? "rn-icon-tile--lg" : ""} ${className}`}
    >
      <Icon />
    </span>
  );
}
