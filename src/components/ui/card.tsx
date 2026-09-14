import type { ElementType, ReactNode } from "react";

/**
 * Card. A white surface with a 12px radius, a hairline and a soft navy-tinted shadow.
 *
 * `interactive` adds the hover lift and the focus-within shadow, for a card that is one link
 * (put `after:absolute after:inset-0` on its title link, or use the vehicle card's pattern).
 * `panel` is the larger 16px-radius surface for a page section or a form.
 *
 * Styling is `.rn-card` / `.rn-panel` in globals.css, inside `@layer components`, so utilities
 * written beside it (padding, gap, margin) always win.
 */
const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

export function Card({
  as: Tag = "div",
  interactive = false,
  panel = false,
  padding = "md",
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  interactive?: boolean;
  panel?: boolean;
  padding?: keyof typeof PADDING;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const base = panel ? "rn-panel" : `rn-card ${interactive ? "rn-card--interactive" : ""}`;
  return (
    <Tag className={`${base} ${PADDING[padding]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
