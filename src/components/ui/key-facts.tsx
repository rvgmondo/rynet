import type { LucideIcon } from "lucide-react";

/**
 * Key facts: an icon, a label and a value.
 *
 *   inline  icon and value in a wrapping row, the label for screen readers only. Cards.
 *   grid    icon beside a muted label over a semibold value, in a responsive grid. Listings.
 *
 * Rendered as a list of term and value pairs inside list items, so a screen reader hears
 * "Mileage, 147 200 km" rather than a number with no name. Values never wrap mid-unit.
 */
export type KeyFact = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function KeyFacts({
  items,
  variant = "inline",
  className = "",
}: {
  items: KeyFact[];
  variant?: "inline" | "grid";
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={`rn-facts ${variant === "grid" ? "rn-facts--grid" : ""} ${className}`}>
      {items.map(({ icon: Icon, label, value }) => (
        <li key={label} className="rn-facts__item">
          <Icon aria-hidden="true" />
          {variant === "grid" ? (
            <span className="min-w-0">
              <span className="rn-facts__label">{label}</span>
              <span className="rn-facts__value tabular">{value}</span>
            </span>
          ) : (
            <>
              <span className="sr-only">{label}: </span>
              <span className="rn-facts__value tabular">{value}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
