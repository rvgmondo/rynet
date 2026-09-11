import { Children, isValidElement, type ReactNode } from "react";

import { slugify } from "@/lib/slug";

/**
 * Long-form page shell.
 *
 * Legal and editorial pages share one measure, one heading rhythm and one link treatment, so a
 * privacy notice does not read as though it came from a different site. The measure is capped
 * at 65 characters: past that the eye loses the line return, which matters most on exactly the
 * pages people are least motivated to read.
 *
 * REDRAWN. These four routes were the only surface on the marketplace that never touched the
 * design system: no Newsreader on the one thing on the site that is nothing but running prose,
 * no rule, no ground change, browser-default disc bullets, and four and a half thousand pixels
 * of document in a 660px column in the left half of a 1440px screen with the right half empty
 * and thirteen headings nobody could jump to.
 *
 * Two of those are the same problem. The empty half is where the contents index goes, so filling
 * it and making a long notice navigable are one change rather than two. On a phone the index
 * becomes a ruled list under the intro, which is what a contents page is anyway.
 */

/** The document's own headings, read off the children rather than maintained by hand. */
function headingsOf(children: ReactNode): { id: string; label: string }[] {
  const found: { id: string; label: string }[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type !== "h2") continue;

    const props = child.props as { children?: ReactNode };
    const label = typeof props.children === "string" ? props.children : null;
    if (!label) continue;

    found.push({ id: slugify(label), label });
  }

  return found;
}

/** The same children, with an id stamped on every h2 so the index can reach them. */
function withHeadingIds(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type !== "h2") return child;

    const props = child.props as { children?: ReactNode; id?: string };
    if (props.id) return child;
    const label = typeof props.children === "string" ? props.children : null;
    if (!label) return child;

    // A stable id from the heading's own words, so an anchor a person shares keeps working
    // through an edit that moves the section rather than renaming it.
    return { ...child, props: { ...props, id: slugify(label) } } as typeof child;
  });
}

export function Prose({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  const headings = headingsOf(children);

  return (
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <h1 className="rn-head max-w-[16ch]">{title}</h1>
          {intro ? <p className="measure mt-6 text-lg text-ink-secondary">{intro}</p> : null}
          {updated ? (
            <p className="rn-label rn-label--light mt-6 text-ink-muted">Last updated {updated}</p>
          ) : null}
        </div>
      </section>

      <div className="container-page py-[var(--section-base)]">
        <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
          {headings.length > 1 ? (
            /*
             * The contents, in the half of the screen that was empty.
             *
             * Sticky on a wide screen, because the whole point of a contents index on a four
             * thousand pixel document is that it is still there when you are two thousand pixels
             * down. `scroll-mt` on the headings is what keeps a jumped-to section clear of the
             * masthead, and it is already set globally.
             */
            <nav aria-labelledby="contents-heading" className="lg:sticky lg:top-24 lg:self-start">
              <h2 id="contents-heading" className="rn-label text-ink-muted">
                On this page
              </h2>
              <ul className="mt-4 border-t border-line">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="flex min-h-11 items-center border-b border-line px-1 text-sm text-ink-secondary transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
                    >
                      {heading.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <div aria-hidden="true" />
          )}

          <div className="rn-doc measure">{withHeadingIds(children)}</div>
        </div>
      </div>
    </>
  );
}

/**
 * A banner for copy that has not been through legal review.
 *
 * Deliberately loud. The point is that it is impossible to publish this by accident and
 * impossible to miss that it is a draft. It comes off when an attorney has read the page,
 * and not before.
 *
 * It is not a box any more, and its heading is no longer a `<p>`. Inside the Prose shell the
 * paragraph rule reached it and repainted the one thing on the page that was supposed to shout
 * in ordinary body ink, which is the exact opposite of deliberately loud.
 */
export function LegalReviewNotice() {
  return (
    <div role="note" className="measure mb-12 border-t-2 border-warning pt-5">
      <p className="rn-label text-warning">Requires legal review</p>
      <p className="text-sm text-ink-secondary">
        This is a plain-language draft written to be cheap for an attorney to review. It has not
        been reviewed, and it is not legal advice. Do not rely on it, and do not treat this page as
        final until a South African attorney has signed it off.
      </p>
    </div>
  );
}
