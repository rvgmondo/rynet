import { type LucideIcon, SearchX } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Empty state: what happened, why, and the one action that helps.
 *
 *   <EmptyState title="No cars match that combination"
 *     action={<Link className={buttonClasses()} href="/cars">Clear all filters</Link>}>
 *     Widening the price range or removing the province usually brings results back.
 *   </EmptyState>
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  children,
  action,
  headingLevel = 2,
  className = "",
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={`rn-empty ${className}`}>
      <span className="rn-empty__icon" aria-hidden="true">
        <Icon />
      </span>
      <Heading className="rn-empty__title">{title}</Heading>
      {children ? <div className="rn-empty__body">{children}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
