"use client";

import { RefreshCw } from "lucide-react";
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
        <h1 className="text-4xl">Something went wrong</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          That page did not load. It is usually temporary, so trying again is worth a go before
          anything else.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-5 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Try again
          </button>
          <Link
            href="/cars"
            className="inline-flex min-h-11 items-center rounded-md border border-line-interactive px-5 font-semibold hover:bg-surface-sunken"
          >
            Back to the stock
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-8 text-xs text-ink-muted">
            If it keeps happening, quote this when you{" "}
            <Link href="/contact" className="text-accent hover:underline">
              get in touch
            </Link>
            : <code className="tabular">{error.digest}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
