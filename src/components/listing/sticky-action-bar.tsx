"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * The phone action bar's behaviour: it arrives once the buyer has scrolled past the real buttons.
 *
 * The bar exists so a buyer never has to scroll back up to enquire. Before the summary card's own
 * buttons have been reached it would only offer them early, ahead of the demonstration notice that
 * sits above them, and while they are on screen it would repeat them (two prices and two Enquire
 * buttons at once, on the audit's captures). While the footer is on screen it would cover the last
 * lines of the page. So an IntersectionObserver watches both: the bar shows only when the card's
 * buttons are above the viewport and the footer is not in it.
 *
 * It starts hidden. Without JavaScript the enquiry dialog cannot open either, so a bar that never
 * appears loses a no-script visitor nothing the summary card does not already offer.
 *
 * Hidden means `invisible` as well as moved off screen, so nothing in it can take focus or be
 * reached by a screen reader while it is away. `inert` would do the same; visibility has the
 * advantage of transitioning after the slide rather than before it. Reduced motion turns the
 * slide into a cut through the global policy in globals.css.
 */
export function StickyActionBar({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const actions = document.getElementById(watchId);
    // The site footer is the last <footer> on the page; nothing inside a listing uses one.
    const footers = document.querySelectorAll("footer");
    const footer = footers[footers.length - 1] ?? null;
    if (!actions || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    let passedActions = false;
    let footerOnScreen = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === actions) {
          // Passed means scrolled up and out of the top, not still waiting below the fold.
          passedActions = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        } else {
          footerOnScreen = entry.isIntersecting;
        }
      }
      setVisible(passedActions && !footerOnScreen);
    });
    observer.observe(actions);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      data-action-bar=""
      data-visible={visible ? "true" : "false"}
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-card px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_17_35/0.08)] transition-[transform,visibility] duration-[var(--duration-element)] ease-[var(--rn-ease-out)] data-[visible=false]:invisible data-[visible=false]:translate-y-full lg:hidden"
    >
      {children}
    </div>
  );
}
