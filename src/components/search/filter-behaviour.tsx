"use client";

import { useEffect } from "react";

import { countCars } from "./count-action";

/**
 * What the filter panel does once JavaScript arrives, and nothing else. It renders nothing.
 *
 * The panel is server HTML that works on its own: below 1280px it is a full-height sheet that the
 * "Filters" link opens through `:target`, and at 1280px it is the sidebar. This island layers on:
 *
 *   - A real modal sheet: `role="dialog"` and `aria-modal` while open, focus moved into it and
 *     kept there, Escape and the scrim close it and put focus back on the button that opened it,
 *     and the page underneath does not scroll (`html[data-menu-open]`, shared with the menu).
 *   - The live count on "Show 42 cars", from a server action that reads the form exactly as /cars
 *     reads a URL, debounced, with the newest answer winning and a polite status for screen readers.
 *   - Models follow makes: ticking Toyota reveals its models, unticking it hides them and clears
 *     any that were ticked, so a hidden checkbox is never submitted.
 *   - A variant or a city that belongs to a model or province the buyer has just unticked stops
 *     riding along as a hidden input.
 *   - Submitting drops the empty fields a GET form always sends, so the URL a buyer shares reads
 *     `/cars?make=toyota` rather than a row of blanks.
 *
 * Every listener is delegated from the document and every element is looked up when it is needed,
 * because the form is keyed on the search and is replaced whenever the search changes.
 */

const WIDE = "(min-width: 80rem)";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function formQuery(form: HTMLFormElement): string {
  const pairs: [string, string][] = [];
  for (const [key, value] of new FormData(form)) {
    if (typeof value !== "string" || key === "page") continue;
    const trimmed = value.trim();
    if (trimmed) pairs.push([key, trimmed]);
  }
  return new URLSearchParams(pairs).toString();
}

function countLabel(n: number): string {
  if (n === 0) return "No cars match";
  return `Show ${n.toLocaleString("en-ZA")} ${n === 1 ? "car" : "cars"}`;
}

export function FilterBehaviour({ panelId = "filters" }: { panelId?: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const wide = window.matchMedia(WIDE);
    const panel = () => document.getElementById(panelId);
    const sheet = () => panel()?.querySelector<HTMLElement>("[data-filter-sheet]") ?? null;
    const form = () => panel()?.querySelector<HTMLFormElement>("form[data-filter-form]") ?? null;

    let opener: HTMLElement | null = null;
    let timer: number | undefined;
    let sequence = 0;

    const isOpen = () => Boolean(panel()?.hasAttribute("data-open"));

    const announce = (open: boolean) =>
      document.dispatchEvent(new CustomEvent("rn:filters", { detail: open }));

    const open = (from: HTMLElement | null) => {
      const p = panel();
      const s = sheet();
      if (!p || !s || wide.matches || isOpen()) return;
      opener = from;
      p.setAttribute("data-open", "");
      s.setAttribute("role", "dialog");
      s.setAttribute("aria-modal", "true");
      s.setAttribute("aria-labelledby", `${panelId}-heading`);
      root.setAttribute("data-menu-open", "");
      announce(true);
      s.focus();
    };

    const close = (returnFocus: boolean, leaving = false) => {
      const p = panel();
      const s = sheet();
      if (!p || !s) return;
      const wasTarget = p.matches(":target");
      if (!isOpen() && !wasTarget) return;
      p.removeAttribute("data-open");
      s.removeAttribute("role");
      s.removeAttribute("aria-modal");
      s.removeAttribute("aria-labelledby");
      root.removeAttribute("data-menu-open");
      announce(false);
      // Opened by the address (a shared /cars#filters, or a click before hydration): move the
      // fragment on, or `:target` keeps the sheet on screen.
      if (wasTarget && !leaving)
        window.location.replace(`${window.location.pathname}${window.location.search}#results`);
      if (returnFocus) opener?.focus();
      opener = null;
    };

    const refreshCount = () => {
      const f = form();
      if (!f) return;
      const mine = ++sequence;
      countCars(formQuery(f))
        .then((n) => {
          if (mine !== sequence || n === null) return;
          const label = f.querySelector("[data-count-label]");
          const status = f.querySelector("[data-count-status]");
          if (label) label.textContent = countLabel(n);
          if (status) {
            status.textContent =
              n === 0
                ? "No cars match these filters"
                : `${n} ${n === 1 ? "car matches" : "cars match"}`;
          }
        })
        .catch(() => {
          // The button keeps its last number. Submitting still works; the count is a nicety.
        });
    };

    const syncModels = (f: HTMLFormElement, make: HTMLInputElement) => {
      const group = f.querySelector<HTMLElement>(`[data-models-of="${CSS.escape(make.value)}"]`);
      if (group) {
        if (make.checked) {
          group.hidden = false;
          const section = group.closest("details");
          if (section) section.open = true;
        } else {
          group.hidden = true;
          for (const box of group.querySelectorAll<HTMLInputElement>('input[name="model"]')) {
            box.checked = false;
          }
        }
      }
      const empty = f.querySelector<HTMLElement>("[data-models-empty]");
      if (empty) empty.hidden = Boolean(f.querySelector("[data-models-of]:not([hidden])"));
    };

    const syncDependants = (f: HTMLFormElement) => {
      for (const input of f.querySelectorAll<HTMLInputElement>("input[data-needs-model]")) {
        const model = input.dataset.needsModel ?? "";
        input.disabled = !f.querySelector(
          `input[name="model"][value="${CSS.escape(model)}"]:checked`,
        );
      }
      for (const input of f.querySelectorAll<HTMLInputElement>("input[data-needs-province]")) {
        const province = input.dataset.needsProvince ?? "";
        const ticked = f.querySelectorAll('input[name="province"]:checked');
        const own = f.querySelector(
          `input[name="province"][value="${CSS.escape(province)}"]:checked`,
        );
        input.disabled = ticked.length > 0 && !own;
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const trigger = target.closest<HTMLElement>(`[data-filters-open="${panelId}"]`);
      if (trigger) {
        if (wide.matches) return;
        event.preventDefault();
        open(trigger);
        return;
      }

      if (!isOpen()) return;
      if (target.closest("[data-filters-close]")) {
        event.preventDefault();
        close(true);
        return;
      }
      // The scrim is the panel itself, around the sheet.
      if (target === panel()) {
        close(true);
        return;
      }
      if (target.closest("a[href]") && sheet()?.contains(target)) close(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!isOpen()) return;
      const s = sheet();
      if (!s) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }

      if (event.key !== "Tab") return;
      const items = [...s.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!s.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === s)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      const f = input?.closest<HTMLFormElement>("form[data-filter-form]");
      if (!input || !f || f !== form()) return;
      if (input.name === "make") syncModels(f, input);
      if (input.name === "make" || input.name === "model" || input.name === "province") {
        syncDependants(f);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(refreshCount, 250);
    };

    const onSubmit = (event: SubmitEvent) => {
      const f = event.target as HTMLFormElement | null;
      if (!f || f !== form()) return;
      event.preventDefault();
      const action = f.getAttribute("action") || window.location.pathname;
      const query = formQuery(f);
      close(false, true);
      window.location.assign(query ? `${action}?${query}` : action);
    };

    const onWide = () => {
      if (wide.matches) close(false);
    };
    const onHide = () => close(false, true);

    // Arrived on /cars#filters with scripting on: open it properly rather than leaving a bare
    // `:target` sheet with no dialog semantics and a page that still scrolls underneath.
    if (panel()?.matches(":target") && !wide.matches) open(null);

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    wide.addEventListener("change", onWide);
    window.addEventListener("pagehide", onHide);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("change", onChange);
      document.removeEventListener("submit", onSubmit);
      wide.removeEventListener("change", onWide);
      window.removeEventListener("pagehide", onHide);
      window.clearTimeout(timer);
      root.removeAttribute("data-menu-open");
    };
  }, [panelId]);

  return null;
}
