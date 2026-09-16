"use client";

import { useEffect } from "react";

/**
 * Tucks the phone header away while the buyer reads down, and brings it back the moment they
 * scroll up.
 *
 * Below 1024px the sticky header is 64px of every screen, and on a results page it stacked on the
 * Filters and Sort bar for 126px of chrome. On a listing it used to scroll away for good, taking
 * the menu and the search with it. This keeps both one flick away and gives the reading back.
 *
 * It only sets `data-header-hidden` on the root; globals.css decides what that means and only
 * below 1024px, so a desktop never sees the header move. The header is never hidden while the page
 * is near the top, while the menu or the theme menu is open, or while anything in the header has
 * keyboard focus (a keyboard user tabbing into it brings it back, and SC 2.4.11 is about the
 * reverse case). The slide is a transform; the global reduced-motion policy turns it into a cut.
 *
 * Passive listener and one frame of work per scroll burst. No layout is read but scrollY.
 */
const TOP_ZONE = 96;
const DELTA = 8;

export function HeaderScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let last = window.scrollY;
    let queued = false;

    const update = () => {
      queued = false;
      const y = window.scrollY;
      const header = document.querySelector(".rn-header");
      const pinned =
        y < TOP_ZONE ||
        root.hasAttribute("data-menu-open") ||
        // An open theme menu hangs off the header, so the header stays while it is open.
        Boolean(header?.querySelector(':focus-visible, [aria-expanded="true"]'));

      if (pinned) {
        root.removeAttribute("data-header-hidden");
      } else if (y > last + DELTA) {
        root.setAttribute("data-header-hidden", "");
      } else if (y < last - DELTA) {
        root.removeAttribute("data-header-hidden");
      } else {
        return;
      }
      last = y;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.removeAttribute("data-header-hidden");
    };
  }, []);

  return null;
}
