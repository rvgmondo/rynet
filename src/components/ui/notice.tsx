import { AlertTriangle, ChevronDown, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Notice: a calm disclosure. Not an alert, not a banner that shouts.
 *
 *   info     blue ground. The demonstration notice on a listing or dealership page is this.
 *   warning  amber ground, for something the reader must act on.
 *   neutral  grey ground.
 *
 * One Notice per page for the demonstration disclosure is the target. It is a `role="note"`,
 * never `role="alert"`: nothing here is urgent enough to interrupt a screen reader.
 *
 *   <Notice title="Demonstration listing">
 *     This car and its dealership are example data. It is not for sale.
 *   </Notice>
 *
 * COMPACT. On a results page, the home page and a dealership page the full explanation ran five to
 * seven lines on a phone and became the biggest text above the first photograph, so the disclosure
 * read as the headline. `compact` with a `details` label keeps the fact in the always-visible title
 * ("Demo listings. Nothing here is for sale.") and folds the explanation into a native disclosure,
 * which opens with a keyboard and without JavaScript. The title must carry the whole warning on its
 * own; the fold is only the why.
 *
 *   <Notice compact title="These are demo listings. Nothing here is for sale."
 *     details="Why these are examples">...</Notice>
 */
export function Notice({
  tone = "info",
  title,
  icon,
  compact = false,
  details,
  className = "",
  children,
}: {
  tone?: "info" | "warning" | "neutral";
  title?: ReactNode;
  icon?: LucideIcon;
  /** Title always visible, explanation folded behind `details`. */
  compact?: boolean;
  /** The label of the fold in a compact notice, such as "Why these are examples". */
  details?: string;
  className?: string;
  children?: ReactNode;
}) {
  const Icon = icon ?? (tone === "warning" ? AlertTriangle : Info);
  const toneClass =
    tone === "warning" ? "rn-notice--warning" : tone === "neutral" ? "rn-notice--neutral" : "";

  if (compact && title && details && children) {
    return (
      <div role="note" className={`rn-notice ${toneClass} ${className}`}>
        <Icon aria-hidden="true" />
        <details className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-0.5 [&::-webkit-details-marker]:hidden">
            <span className="rn-notice__title">{title}</span>
            <span className="rn-link inline-flex min-h-6 items-center gap-1 group-hover:decoration-current">
              {details}
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-[var(--duration-micro)] group-open:rotate-180"
              />
            </span>
          </summary>
          <div className="mt-1.5 max-w-[72ch]">{children}</div>
        </details>
      </div>
    );
  }

  return (
    <div role="note" className={`rn-notice ${toneClass} ${className}`}>
      <Icon aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="rn-notice__title">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
