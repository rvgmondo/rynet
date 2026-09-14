import { AlertTriangle, Info, type LucideIcon } from "lucide-react";
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
 */
export function Notice({
  tone = "info",
  title,
  icon,
  className = "",
  children,
}: {
  tone?: "info" | "warning" | "neutral";
  title?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}) {
  const Icon = icon ?? (tone === "warning" ? AlertTriangle : Info);
  return (
    <div
      role="note"
      className={`rn-notice ${tone === "warning" ? "rn-notice--warning" : tone === "neutral" ? "rn-notice--neutral" : ""} ${className}`}
    >
      <Icon aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="rn-notice__title">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
