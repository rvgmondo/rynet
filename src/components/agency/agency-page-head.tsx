import type { ReactNode } from "react";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";

/**
 * The opening band of every inner agency page: white, under the navy header.
 *
 * Breadcrumbs (the visible trail is Rynet Digital and the parents; the JSON-LD carries the whole
 * trail), an optional eyebrow, the page's H1, a lead, optional actions, and an optional aside
 * that sits beside the text from 1024px and under it on a phone.
 */
export function AgencyPageHead({
  trail,
  eyebrow,
  title,
  lead,
  actions,
  aside,
}: {
  trail: Crumb[];
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-card">
      <div className="container-page py-10 sm:py-14 lg:py-16">
        <Breadcrumbs trail={trail} className="mb-6" />
        <div
          className={
            aside
              ? "grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16"
              : ""
          }
        >
          <div className="min-w-0 max-w-3xl">
            {eyebrow ? <p className="rn-eyebrow mb-3">{eyebrow}</p> : null}
            <h1 className="rn-h1">{title}</h1>
            {lead ? <p className="rn-lead mt-4 max-w-2xl">{lead}</p> : null}
            {actions ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {actions}
              </div>
            ) : null}
          </div>
          {aside ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
