"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button-classes";

/**
 * "Filters (2)", the way into the filter sheet below 1280px.
 *
 * Before hydration, and with scripting off, it is a link to `#filters`, which opens the sheet
 * through `:target` and needs nothing else. Once FilterBehaviour is running it becomes a real
 * button with `aria-expanded`, `aria-controls` and `aria-haspopup="dialog"`, because what it does
 * then is open a modal, and a link that opens a modal is announced as the wrong thing.
 */
export function FiltersButton({
  count,
  controls = "filters",
  className = "",
}: {
  count: number;
  controls?: string;
  className?: string;
}) {
  const [enhanced, setEnhanced] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setEnhanced(true);
    const onState = (event: Event) => setExpanded(Boolean((event as CustomEvent<boolean>).detail));
    document.addEventListener("rn:filters", onState);
    return () => document.removeEventListener("rn:filters", onState);
  }, []);

  const classes = buttonClasses({ variant: "outline", size: "sm", className });
  const content = (
    <>
      <SlidersHorizontal aria-hidden="true" />
      <span>Filters</span>
      {count > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="inline-flex min-w-6 items-center justify-center rounded-full bg-secondary px-1.5 text-xs leading-6 font-semibold text-on-secondary tabular"
          >
            {count}
          </span>
          <span className="sr-only">({count} applied)</span>
        </>
      ) : null}
    </>
  );

  return enhanced ? (
    <button
      type="button"
      data-filters-open={controls}
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      className={classes}
    >
      {content}
    </button>
  ) : (
    <a href={`#${controls}`} data-filters-open={controls} className={classes}>
      {content}
    </a>
  );
}
