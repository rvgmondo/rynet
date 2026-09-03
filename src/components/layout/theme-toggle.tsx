"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/**
 * Theme toggle.
 *
 * Three states, not two, because "system" is a real choice. Collapsing it into a binary
 * means a visitor who wants to follow their operating system cannot say so once they have
 * touched the control.
 *
 * Built from real `<input type="radio">` elements, not buttons carrying `role="radio"`.
 * The first version used buttons and the comment claimed they got arrow-key navigation;
 * they did not. A native radio group gets arrow keys, roving focus and correct "2 of 3"
 * announcements from the platform. Recreating that on buttons means a roving tabindex
 * implementation nobody asked for, to end up where the browser already was.
 *
 * The input is visually hidden rather than `display: none`, so it stays focusable and the
 * focus ring can be drawn on the label through `peer-focus-visible`.
 *
 * Renders a fixed-size placeholder before mount. The theme is not known during server
 * render, and swapping the control in afterwards would shift the header.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-11 w-[7.5rem]" aria-hidden="true" />;
  }

  const current = theme ?? "system";

  return (
    <fieldset className="flex h-11 items-center gap-0.5 rounded-full border border-line p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const id = `theme-${value}`;
        const selected = current === value;
        return (
          <div key={value} className="contents">
            <input
              id={id}
              type="radio"
              name="theme"
              value={value}
              checked={selected}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              title={label}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-[var(--duration-micro)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus-ring)] ${
                selected
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="sr-only">{label}</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
