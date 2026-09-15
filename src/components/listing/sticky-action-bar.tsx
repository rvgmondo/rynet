"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * The phone action bar's behaviour: it is there whenever the real buttons are not.
 *
 * The bar exists so a buyer never has to hunt for Enquire. While the summary card's own buttons are
 * on screen it would repeat them (two prices and two Enquire buttons at once, on the audit's
 * captures), and while the footer is on screen it would cover the last lines of the page. So an
 * IntersectionObserver watches both, and the bar shows whenever the card's buttons are off screen
 * in either direction (not yet reached, or scrolled past) and the footer is not in view. The
 * demonstration disclosure travels in the bar itself ("Demo listing" under the price), so showing
 * it before the page's notice has been reached tells a buyer nothing false.
 *
 * It starts hidden, and shows on the observer's first report. Without JavaScript the enquiry dialog
 * cannot open either, so a bar that never appears loses a no-script visitor nothing the summary
 * card does not already offer.
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

    let actionsOnScreen = true;
    let footerOnScreen = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === actions) actionsOnScreen = entry.isIntersecting;
        else footerOnScreen = entry.isIntersecting;
      }
      setVisible(!actionsOnScreen && !footerOnScreen);
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
