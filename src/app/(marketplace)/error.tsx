"use client";

import Link from "next/link";
import * as React from "react";

/**
 * The error boundary.
 *
 * Says what to do next rather than what went wrong, because the technical detail is no use
 * to a buyer and is exactly what should not be shown to a stranger. The digest is included
 * because it is the one thing that helps if they report it, and it identifies nothing.
 *
 * The reset button is a real retry: most errors here are a transient database read on a
 * shared host, and trying again genuinely works.
 */
export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Marketplace error boundary:", error);
  }, [error]);

  return (
    <div className="container-page py-[var(--section-loose)]">
      <div className="measure">
        <p className="rn-label text-ink-muted">Rynet</p>
        <h1 className="rn-head mt-6 max-w-[14ch]">Something went wrong</h1>
        <p className="rn-prose mt-5 text-ink-secondary">
          That page did not load. It is usually temporary, so trying again is worth a go before
          anything else.
        </p>

        <hr className="rn-rule mt-10" />

        {/* One red object. The secondary action takes the ink flip, which is also the only
            hover this design has: `hover:bg-surface-sunken` on a page already standing on the
            sunken ground was no hover at all in dark. */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rn-label inline-flex min-h-12 items-center bg-accent-solid px-6 text-ink-on-accent hover:bg-accent-solid-hover"
          >
            Try again
          </button>
          <Link
            href="/cars"
            className="rn-label inline-flex min-h-12 items-center border border-line-interactive px-6 hover:bg-ink hover:text-ink-inverse"
          >
            Back to the stock
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-10 border-t border-line pt-5 text-xs text-ink-muted">
            If it keeps happening, quote this when you{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-line-interactive underline-offset-4 hover:decoration-ink"
            >
              get in touch
            </Link>
            : <code className="tabular">{error.digest}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
