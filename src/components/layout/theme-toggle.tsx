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
 *
 * `name` is a required-in-practice prop, not decoration. Each header mounts this twice, once
 * for the wide layout and once inside the mobile drawer, and with a single hard-coded group
 * name all six radios were one radio group: only one could be checked, and it was whichever
 * copy happened to render last, which is the hidden one. The visible control therefore
 * reported no option selected at all, and the duplicate ids meant every label in the second
 * copy pointed at an input in the first. Two mount points, two names.
 */
export function ThemeToggle({ name = "theme" }: { name?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-11 w-[8rem]" aria-hidden="true" />;
  }

  const current = theme ?? "system";

  return (
    /* `w-fit`, because a fieldset is a block and stretches. In the agency drawer it ran the
       full menu width with its three 40px segments crammed against the left end. */
    <fieldset className="flex h-11 w-fit items-center border border-line-interactive">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const id = `${name}-${value}`;
        const selected = current === value;
        return (
          <div key={value} className="contents">
            <input
              id={id}
              type="radio"
              name={name}
              value={value}
              checked={selected}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              title={label}
              className={`flex size-10 cursor-pointer items-center justify-center transition-colors duration-[var(--duration-micro)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--rn-focus-ring)] ${
                selected
                  ? "bg-ink text-ink-inverse"
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
