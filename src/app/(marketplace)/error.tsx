"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { RynetMark } from "@/components/brand/rynet-mark";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";

/**
 * The error boundary.
 *
 * Says what to do next rather than what went wrong, because the technical detail is no use
 * to a buyer and is exactly what should not be shown to a stranger. The digest is included
 * because it is the one thing that helps if they report it, and it identifies nothing.
 *
 * The reset button is a real retry: most errors here are a transient database read on a
 * shared host, and trying again genuinely works.
 *
 * Drawn as the same centred panel as the 404, so the two pages a lost visitor can land on look
 * like one family.
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
    <div className="container-narrow py-[var(--section-base)]">
      <div className="rn-panel px-5 py-10 text-center sm:px-12 sm:py-14">
        <RynetMark className="mx-auto h-12 w-auto" />
        <p className="rn-eyebrow mt-6">Something went wrong</p>
        <h1 className="rn-h1 mt-2">That page did not load</h1>
        <p className="rn-lead mx-auto mt-4 max-w-xl text-muted">
          It is usually temporary, so trying again is worth a go before anything else.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" size="lg" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Link href="/cars" className={buttonClasses({ variant: "outline", size: "lg" })}>
            Browse cars for sale
          </Link>
        </div>

        {error.digest ? (
          <p className="mx-auto mt-10 max-w-md border-t border-line pt-5 text-sm text-muted">
            If it keeps happening, quote this reference when you{" "}
            <Link href="/contact" className="font-semibold text-heading">
              get in touch
            </Link>
            :{" "}
            <code className="rounded-xs bg-subtle px-1.5 py-0.5 text-heading tabular">
              {error.digest}
            </code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
