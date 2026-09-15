import type { ReactNode } from "react";

import { TextLink } from "./text-link";

/**
 * Section header: an optional eyebrow, the title, an optional lead, and an optional action link
 * on the right that looks like a link (accent words and an arrow), never a button.
 *
 *   <SectionHeader id="fresh-heading" eyebrow="Just in" title="Fresh on the floor"
 *     action={{ href: "/cars?sort=newest", label: "All newest stock" }} />
 *
 * Pass the section's `aria-labelledby` target as `id`. The eyebrow is the only uppercase text a
 * page is allowed, and it is optional: most sections do not need one.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  action,
  as: Heading = "h2",
  className = "",
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  action?: { href: string; label: string };
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`rn-section-header ${className}`}>
      <div className="rn-section-header__text">
        {eyebrow ? <p className="rn-eyebrow">{eyebrow}</p> : null}
        <Heading
          id={id}
          className={Heading === "h1" ? "rn-h1" : Heading === "h3" ? "rn-h3" : "rn-h2"}
        >
          {title}
        </Heading>
        {lead ? <p className="rn-section-header__lead">{lead}</p> : null}
      </div>
      {action ? (
        <TextLink href={action.href} variant="action">
          {action.label}
        </TextLink>
      ) : null}
    </div>
  );
}
