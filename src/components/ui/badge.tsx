import { BadgeCheck, Info, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Badge. A small pill of fact, in sentence case.
 *
 *   neutral   grey, for anything without a status
 *   verified  green with a check. Only for a dealership whose `isDemonstration` is false.
 *   demo      the demonstration marker: white with a hairline, quiet and always legible.
 *             "Demo listing" on a card, "Demo dealership" on a dealership. Never removed.
 *   new       blue, for a new vehicle
 *   drop      green with a down arrow: "Reduced by R 13 400", never a negative number
 *   warning   amber
 *
 * `onPhoto` adds a soft shadow so the badge reads over any photograph.
 *
 * Every tone pairs its text with its own subtle ground at 4.5:1 or better in both themes (see
 * docs/contrast-report.md). Status is never colour alone: the words carry it.
 */
export type BadgeTone = "neutral" | "verified" | "demo" | "new" | "drop" | "warning";

const TONE: Record<BadgeTone, string> = {
  neutral: "",
  verified: "rn-badge--verified",
  demo: "rn-badge--demo",
  new: "rn-badge--new",
  drop: "rn-badge--drop",
  warning: "rn-badge--warning",
};

const DEFAULT_ICON: Partial<Record<BadgeTone, ReactNode>> = {
  verified: <BadgeCheck aria-hidden="true" />,
  demo: <Info aria-hidden="true" />,
  drop: <TrendingDown aria-hidden="true" />,
};

export function Badge({
  tone = "neutral",
  icon,
  onPhoto = false,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  /** Pass `null` to suppress the tone's default icon, or any node to replace it. */
  icon?: ReactNode | null;
  onPhoto?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const glyph = icon === undefined ? DEFAULT_ICON[tone] : icon;
  return (
    <span className={`rn-badge ${TONE[tone]} ${onPhoto ? "rn-badge--on-photo" : ""} ${className}`}>
      {glyph}
      {children}
    </span>
  );
}

/** The one demonstration marker for a listing. Its wording is fixed on purpose. */
export function DemoListingBadge({
  onPhoto = false,
  className = "",
}: {
  onPhoto?: boolean;
  className?: string;
}) {
  return (
    <Badge tone="demo" onPhoto={onPhoto} className={className}>
      Demo listing
    </Badge>
  );
}

/**
 * The dealership marker. A demonstration dealership is never called verified: it gets the demo
 * badge, and only a real dealership (isDemonstration false) gets the verified one.
 */
export function DealershipStatusBadge({
  isDemonstration,
  className = "",
}: {
  isDemonstration: boolean;
  className?: string;
}) {
  return isDemonstration ? (
    <Badge tone="demo" className={className}>
      Demo dealership
    </Badge>
  ) : (
    <Badge tone="verified" className={className}>
      Verified dealership
    </Badge>
  );
}
