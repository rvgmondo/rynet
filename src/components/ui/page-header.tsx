import type { ReactNode } from "react";

/**
 * PageHeader: the opening of a page that is not a search or a listing.
 *
 * Eyebrow, H1, lead, then an optional meta row (a date, the legal review marker) and actions
 * (chips, a link, a button), on the white band with a hairline under it.
 *
 * THE RIGHT-HAND SIDE IS NEVER LEFT EMPTY. Every page used to open the same way: a stack of text in
 * the left half of a 1280px band and nothing in the other half, which is what made the site read
 * as a template. From 1024px the header now takes one of two shapes:
 *
 *   split  (no `aside`)  the eyebrow and title on the left, the lead, meta and actions on the right,
 *                        bottom-aligned with the title, so the band is shorter and fills its width
 *   aside  (`aside`)     the title and lead on the left, real content on the right: an index, a
 *                        specimen, a form, a photo strip. Never a decoration.
 *
 * Below 1024px both stack in reading order. Pass `before` for anything that sits above the title
 * (breadcrumbs), and utilities in `className` / `innerClassName` to change the band or its padding
 * (a page whose search panel overlaps the band's bottom edge adds bottom padding).
 *
 *   <PageHeader id="contact-heading" eyebrow="Contact" title="How can we help?"
 *     lead="Pick the route that fits." actions={<RouteChips />} />
 */
export function PageHeader({
  id,
  eyebrow,
  title,
  lead,
  meta,
  actions,
  aside,
  before,
  className = "",
  innerClassName = "",
  titleClassName = "",
}: {
  /** The H1's id, which the band's `aria-labelledby` points at. */
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** A small row under the lead: "Last updated", the legal review marker. */
  meta?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  before?: ReactNode;
  className?: string;
  innerClassName?: string;
  titleClassName?: string;
}) {
  const body =
    lead || meta || actions ? (
      <div className="rn-pagehead__body">
        {lead ? <p className="rn-lead text-pretty">{lead}</p> : null}
        {meta ? <div className="rn-pagehead__meta">{meta}</div> : null}
        {actions ? <div className="rn-pagehead__actions">{actions}</div> : null}
      </div>
    ) : null;

  return (
    <section aria-labelledby={id} className={`rn-pagehead ${className}`}>
      <div className={`container-page rn-pagehead__inner ${innerClassName}`}>
        {before}
        <div className={`rn-pagehead__grid ${aside ? "rn-pagehead__grid--aside" : ""}`}>
          <div className="rn-pagehead__title">
            {eyebrow ? <p className="rn-eyebrow">{eyebrow}</p> : null}
            <h1 id={id} className={`rn-h1 ${titleClassName}`}>
              {title}
            </h1>
            {aside ? body : null}
          </div>
          {aside ? <div className="rn-pagehead__aside">{aside}</div> : body}
        </div>
      </div>
    </section>
  );
}
