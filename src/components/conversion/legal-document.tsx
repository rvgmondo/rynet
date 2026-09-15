import { ArrowRight, ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { PageHeader } from "@/components/ui/page-header";
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
 * From 1280px a third column lists the other documents in the set, with this one marked, and a
 * route to a person, so the band to the right of the reading column is a way on rather than
 * empty grey. The review marker is not repeated there: one marker per page.
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

/** The documents a reader of one of them most often wants next. */
const DOCUMENTS = [
  { href: "/privacy", label: "Privacy notice" },
  { href: "/terms", label: "Terms of use" },
  { href: "/cookies", label: "Cookie notice" },
  { href: "/accessibility", label: "Accessibility statement" },
] as const;

function DocumentsAside({ path }: { path: string }) {
  return (
    <aside
      aria-labelledby="documents-heading"
      className="hidden xl:sticky xl:top-24 xl:block xl:self-start"
    >
      <h2 id="documents-heading" className="px-3 text-sm font-semibold text-heading">
        Related documents
      </h2>
      <ul className="mt-3 space-y-0.5">
        {DOCUMENTS.map((doc) => {
          const current = doc.href === path;
          return (
            <li key={doc.href}>
              <Link
                href={doc.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors duration-[var(--duration-micro)] hover:bg-subtle hover:text-heading ${
                  current ? "bg-card font-semibold text-heading shadow-xs" : "text-body"
                }`}
              >
                <FileText aria-hidden="true" className="size-4 shrink-0 text-muted" />
                {doc.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-line px-3 pt-5">
        <p className="text-sm text-body">Something here unclear, or wrong about you?</p>
        <Link href="/contact" className="rn-link-arrow mt-2 text-sm">
          Ask a person
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </aside>
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

      <PageHeader
        id="document-heading"
        eyebrow={eyebrow}
        title={title}
        titleClassName="max-w-[20ch]"
        lead={intro}
        meta={
          <>
            <p>Last updated {updated}</p>
            {reviewedAt !== undefined ? <LegalReviewMarker reviewedAt={reviewedAt} /> : null}
          </>
        }
      />

      <div className="container-page py-8 sm:py-12 lg:py-16">
        <div
          className={`grid gap-6 ${
            hasIndex
              ? "lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[14rem_minmax(0,46rem)_minmax(0,1fr)]"
              : "xl:grid-cols-[minmax(0,46rem)_minmax(0,16rem)] xl:gap-12"
          }`}
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

          {/* Sized to the reading column, so the white card never carries an empty right third. */}
          <article className="rn-card w-full max-w-[46rem] min-w-0 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="rn-doc rn-links measure break-words [&>h2:first-child]:mt-0 [&>h2:first-child]:border-t-0 [&>h2:first-child]:pt-0">
              {withHeadingIds(children)}
            </div>
          </article>

          <DocumentsAside path={path} />
        </div>
      </div>
    </>
  );
}
