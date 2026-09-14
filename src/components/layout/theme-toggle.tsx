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
 * Theme switch: light, system, dark.
 *
 * Three states, not two, because "system" is a real choice. It lives in the footer and at the
 * bottom of the mobile menu, never in the header's prime slot.
 *
 * Built from real radio inputs, which get arrow keys, roving focus and "2 of 3" announcements
 * from the platform. The input is visually hidden but focusable, and the ring is drawn on its
 * label (see .rn-theme in globals.css). Inside `.on-navy` it takes the navy styling.
 *
 * `name` must be unique per mount. The footer and the mobile menu both render one, and with a
 * shared name all six radios become one group and the visible control shows nothing selected.
 *
 * A fixed-size placeholder renders before mount, because the theme is unknown on the server and
 * swapping the control in afterwards would shift the layout.
 */
export function ThemeToggle({ name = "theme" }: { name?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-11 w-[7.5rem]" aria-hidden="true" />;
  }

  const current = theme ?? "system";

  return (
    <fieldset className="rn-theme">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const id = `${name}-${value}`;
        return (
          <React.Fragment key={value}>
            <input
              id={id}
              type="radio"
              name={name}
              value={value}
              checked={current === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <label htmlFor={id} title={label}>
              <Icon aria-hidden="true" className="size-4" />
              <span className="sr-only">{label}</span>
            </label>
          </React.Fragment>
        );
      })}
    </fieldset>
  );
}
