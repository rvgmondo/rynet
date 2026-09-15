import { ChevronDown } from "lucide-react";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { slugify } from "@/lib/slug";

/**
 * The document layout for the privacy notice, the terms, the cookie notice and the
 * accessibility statement.
 *
 * A white page on the grey ground, one comfortable measure, and a contents index that stays in
 * view on a wide screen, because the whole point of an index on a long document is that it is
 * still there halfway down. On a phone the index folds into a native disclosure under the
 * title, so it costs one row until somebody wants it, and needs no JavaScript to open.
 *
 * The legal review marker is the standard one, once, in the title block beside the date. A page
 * without a `reviewedAt` key (the accessibility statement, which is a description rather than a
 * legal draft) shows no marker at all. Pass `null` to show it.
 *
 * The index is read off the document's own h2 headings, so it cannot drift from them, and each
 * heading gets a stable id from its words, so a shared link survives an edit that moves the
 * section rather than renaming it.
 */

type Heading = { id: string; label: string };

function headingsOf(children: ReactNode): Heading[] {
  const found: Heading[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== "h2") continue;
    const label = (child.props as { children?: ReactNode }).children;
    if (typeof label === "string") found.push({ id: slugify(label), label });
  }
  return found;
}

function withHeadingIds(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== "h2") return child;
    const props = child.props as { children?: ReactNode; id?: string };
    if (props.id || typeof props.children !== "string") return child;
    return cloneElement(child as ReactElement<{ id?: string }>, { id: slugify(props.children) });
  });
}

function ContentsList({ headings }: { headings: Heading[] }) {
  return (
    <ul className="space-y-0.5">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className="flex min-h-10 items-center rounded-sm px-3 py-2 text-sm text-body transition-colors duration-[var(--duration-micro)] hover:bg-subtle hover:text-heading"
          >
            {heading.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LegalDocument({
  eyebrow,
  title,
  intro,
  updated,
  path,
  reviewedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /** "26 August 2026", as written. */
  updated: string;
  path: string;
  /** Omit for a page that is not legal wording. `null` means not yet reviewed. */
  reviewedAt?: string | null;
  children: ReactNode;
}) {
  const headings = headingsOf(children);
  const hasIndex = headings.length > 1;

  return (
    <>
      <Breadcrumbs trail={[{ href: path, label: title }]} />

      <section aria-labelledby="document-heading" className="border-b border-line bg-card">
        <div className="container-page py-10 sm:py-14">
          <p className="rn-eyebrow">{eyebrow}</p>
          <h1 id="document-heading" className="rn-h1 mt-3 max-w-[20ch]">
            {title}
          </h1>
          <p className="rn-lead mt-4 max-w-2xl">{intro}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-sm text-muted">Last updated {updated}</p>
            {reviewedAt !== undefined ? <LegalReviewMarker reviewedAt={reviewedAt} /> : null}
          </div>
        </div>
      </section>

      <div className="container-page py-8 sm:py-12 lg:py-16">
        <div
          className={`grid gap-6 ${hasIndex ? "lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12" : ""}`}
        >
          {hasIndex ? (
            <>
              <details className="group rn-card lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-heading [&::-webkit-details-marker]:hidden">
                  On this page
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 text-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <nav aria-label="On this page" className="border-t border-line p-2">
                  <ContentsList headings={headings} />
                </nav>
              </details>

              <nav
                aria-labelledby="contents-heading"
                className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
              >
                <h2 id="contents-heading" className="px-3 text-sm font-semibold text-heading">
                  On this page
                </h2>
                <div className="mt-3 border-l border-line">
                  <ContentsList headings={headings} />
                </div>
              </nav>
            </>
          ) : null}

          <article className="rn-card w-full min-w-0 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="rn-doc measure break-words [&>h2:first-child]:mt-0 [&>h2:first-child]:border-t-0 [&>h2:first-child]:pt-0 [&_a]:font-medium [&_a]:text-accent">
              {withHeadingIds(children)}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
