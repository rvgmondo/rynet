"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/** "system" until next-themes has read the stored choice, which is also its own default. */
const SYSTEM = OPTIONS[1];

/**
 * The colour theme control in the header: one icon button and a small menu of three choices.
 *
 * Three states, not two, because "system" is a real choice. The button shows the current choice
 * (sun, monitor or moon) and says it in its name, so a screen reader hears "Colour theme: Dark"
 * before opening anything.
 *
 * A menu button with `menuitemradio` items, per the WAI-ARIA menu button pattern:
 *   - Enter, Space, a click, Arrow Down or Arrow Up opens it with focus on the current choice.
 *   - Arrow keys move between the three (wrapping), Home and End jump, a letter jumps to the
 *     choice that starts with it.
 *   - Enter, Space or a click chooses, closes the menu and puts focus back on the button.
 *   - Escape closes it and puts focus back on the button. A click outside closes it where it is.
 *   - Tab closes it and lets focus carry on to the next thing on the page.
 *
 * Opening it closes the mobile menu sheet, so only one thing hangs off the header at a time.
 *
 * Persistence and the no-flash first paint are next-themes, unchanged: the ThemeProvider in each
 * layout writes `data-theme` on <html> from localStorage ("theme") before the page paints, and
 * `setTheme` here stores the choice under that same key.
 *
 * The theme is unknown on the server, so before mount this renders an empty box the size of the
 * button. Swapping in a guessed icon would show the wrong one to everyone who chose a theme.
 */
export function ThemeMenu({ buttonClassName }: { buttonClassName: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const current = OPTIONS.find((option) => option.value === theme) ?? SYSTEM;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const openMenu = () => {
    for (const sheet of document.querySelectorAll<HTMLDetailsElement>("details.rn-menu[open]")) {
      sheet.open = false;
    }
    setOpen(true);
  };

  /*
   * On open, focus the current choice. A click anywhere outside closes the menu, and so does focus
   * leaving for somewhere else on the page (a screen reader's own navigation, say).
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return;
    menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) close(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      const to = event.relatedTarget as Node | null;
      if (to && !root.contains(to)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [open, close]);

  if (!mounted) {
    return <span className="block size-11 shrink-0" aria-hidden="true" />;
  }

  const items = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []),
  ];

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) {
      event.preventDefault();
      openMenu();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const last = list.length - 1;
    let next = -1;

    switch (event.key) {
      case "ArrowDown":
        next = index < 0 || index === last ? 0 : index + 1;
        break;
      case "ArrowUp":
        next = index <= 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        // No preventDefault: focus moves on to the next thing on the page as it normally would.
        setOpen(false);
        return;
      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
          const key = event.key.toLowerCase();
          next = OPTIONS.findIndex((option) => option.label.toLowerCase().startsWith(key));
        }
    }

    if (next >= 0) {
      event.preventDefault();
      list[next]?.focus();
    }
  };

  const CurrentIcon = current.Icon;

  return (
    <div ref={rootRef} className="rn-thememenu">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Colour theme: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={buttonClassName}
      >
        <CurrentIcon aria-hidden="true" className="size-5" />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Colour theme"
        tabIndex={-1}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
        className="rn-thememenu__menu"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const checked = current.value === value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              tabIndex={-1}
              onClick={() => {
                setTheme(value);
                close(true);
              }}
              className="rn-thememenu__item"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
              <Check aria-hidden="true" className="rn-thememenu__check size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
