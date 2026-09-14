"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * The behaviour a native `<details>` menu is missing, and nothing else.
 *
 * The menu stays a `<details>`, which gives it keyboard operation, an announced expanded state,
 * and a working menu before hydration and with scripting off. What a disclosure does not do on
 * its own is behave like a menu sheet:
 *
 *   - It closes whenever the path changes, and on the tap itself, because tapping the link to the
 *     page you are already on changes no path at all. A submit inside it closes it too.
 *   - Escape closes it and puts focus back on the button that opened it.
 *   - Anything marked `data-menu-close` closes it, which is how the scrim works.
 *   - While it is open the page under it does not scroll (`html[data-menu-open]`).
 *
 * Every close is by event delegation, so the server-rendered links and the scrim need no
 * handlers of their own.
 */
export function MobileMenu({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: the path is the trigger, not a value read inside.
  useEffect(() => {
    if (ref.current?.open) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const root = document.documentElement;

    const close = (returnFocus: boolean) => {
      if (!details.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    };

    const onToggle = () => {
      if (details.open) root.setAttribute("data-menu-open", "");
      else root.removeAttribute("data-menu-open");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || target.closest("summary")) return;
      if (target.closest("a[href], [data-menu-close]")) close(false);
    };

    const onSubmit = () => close(false);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) {
        event.preventDefault();
        close(true);
      }
    };

    details.addEventListener("toggle", onToggle);
    details.addEventListener("click", onClick);
    details.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKey);
    return () => {
      details.removeEventListener("toggle", onToggle);
      details.removeEventListener("click", onClick);
      details.removeEventListener("submit", onSubmit);
      document.removeEventListener("keydown", onKey);
      root.removeAttribute("data-menu-open");
    };
  }, []);

  return (
    <details ref={ref} className={`rn-menu group ${className}`}>
      {children}
    </details>
  );
}
