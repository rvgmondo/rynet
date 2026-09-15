"use client";

import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * The gallery's small progressive-enhancement island.
 *
 * The gallery itself is a server-rendered scroll-snap row that swipes, scrolls with the keyboard
 * and jumps from its thumbnail links with no JavaScript at all. This adds three things once it has
 * mounted, and nothing else:
 *
 * 1. Previous and next buttons over the photograph, from 640px, which wrap at the ends so neither
 *    ever has to be disabled (a disabled button drops the focus of the person pressing it).
 * 2. A "3 / 12" counter in place of the static "12 photos" chip.
 * 3. Thumbnail clicks that scroll the row in place instead of jumping the whole page to an anchor,
 *    and a current-thumbnail state that follows swiping.
 *
 * It reads the scroll position on the next animation frame rather than on every scroll event, and
 * honours prefers-reduced-motion by jumping instead of gliding.
 */
export function GalleryControls({
  stageId,
  stripId,
  count,
}: {
  stageId: string;
  stripId: string;
  count: number;
}) {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (target: number) => {
      const stage = document.getElementById(stageId);
      if (!stage) return;
      const next = (target + count) % count;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.scrollTo({ left: next * stage.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [stageId, count],
  );

  useEffect(() => {
    const stage = document.getElementById(stageId);
    if (!stage) return;
    const strip = document.getElementById(stripId);
    setReady(true);

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = Math.min(
          count - 1,
          Math.max(0, Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth))),
        );
        setIndex(current);
        strip?.querySelectorAll<HTMLAnchorElement>("a[data-shot]").forEach((link) => {
          if (Number(link.dataset.shot) === current) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    };

    const onThumb = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-shot]");
      if (!link) return;
      event.preventDefault();
      go(Number(link.dataset.shot));
    };

    stage.addEventListener("scroll", sync, { passive: true });
    strip?.addEventListener("click", onThumb);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("scroll", sync);
      strip?.removeEventListener("click", onThumb);
    };
  }, [stageId, stripId, count, go]);

  const arrow =
    "absolute top-1/2 z-[1] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-card text-heading shadow-card transition-[background-color,box-shadow] duration-[var(--duration-micro)] hover:bg-subtle hover:shadow-hover sm:grid";

  return (
    <>
      {ready ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-controls={stageId}
            className={`${arrow} left-3`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            <span className="sr-only">Previous photograph</span>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-controls={stageId}
            className={`${arrow} right-3`}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
            <span className="sr-only">Next photograph</span>
          </button>
        </>
      ) : null}

      <p className="pointer-events-none absolute right-3 bottom-3 z-[1] inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[var(--rn-photo-chip)] px-2.5 text-xs font-semibold text-white tabular">
        <Camera aria-hidden="true" className="size-3.5" />
        {ready ? (
          <>
            <span aria-hidden="true">
              {index + 1} / {count}
            </span>
            <span className="sr-only">
              Photograph {index + 1} of {count}
            </span>
          </>
        ) : (
          <span>{count} photos</span>
        )}
      </p>
    </>
  );
}
