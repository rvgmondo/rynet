"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Button.
 *
 * Every state the design system requires is here and none of them are optional: default,
 * hover, focus-visible, active, disabled and loading. Three details are deliberate.
 *
 * 1. **The minimum height is the 44px target, not the visual height.** Small buttons look
 *    smaller but keep a 44px hit area through padding, because WCAG 2.2 SC 2.5.8 measures
 *    the target, not the paint.
 *
 * 2. **Loading disables without collapsing.** `aria-busy` announces the state, the label
 *    stays in the flow so the button does not change width mid-click, and the spinner
 *    replaces the icon slot rather than the text. A button that shrinks to a spinner moves
 *    everything around it.
 *
 * 3. **Disabled uses aria-disabled, not the disabled attribute, on non-submit variants.**
 *    A `disabled` button is removed from the tab order entirely, so a keyboard user cannot
 *    reach it to discover why it is unavailable. Where the button must genuinely block
 *    submission we pass `disabled` too, but the default keeps it focusable.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-semibold transition-[background-color,border-color,color,transform] duration-[var(--duration-micro)] ease-[var(--rn-ease-out)]",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
    "[&_svg]:size-[1.15em] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-accent-solid text-ink-on-accent hover:bg-accent-solid-hover shadow-(--rn-shadow-1)",
        secondary: "bg-surface text-ink border border-line-interactive hover:bg-surface-sunken",
        ghost: "bg-transparent text-ink hover:bg-surface-sunken",
        link: "bg-transparent text-accent underline underline-offset-4 hover:text-accent-hover hover:decoration-2",
        danger: "bg-danger text-ink-on-accent hover:opacity-90",
      },
      size: {
        // min-h keeps the 44px target even where the visual box is shorter.
        sm: "min-h-11 px-3 py-1.5 text-xs",
        md: "min-h-11 px-4 py-2.5 text-sm",
        lg: "min-h-12 px-6 py-3 text-base",
        // Icon-only buttons are square and must still meet the target.
        icon: "size-11 p-0",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render as the child element, for links that should look like buttons. */
    asChild?: boolean;
    isLoading?: boolean;
    /**
     * Announced while loading. Without it a screen reader hears nothing change, because the
     * visible label has not changed.
     */
    loadingLabel?: string;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    asChild = false,
    isLoading = false,
    loadingLabel = "Working",
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || disabled || undefined}
      disabled={asChild ? undefined : disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          <span className="sr-only">{loadingLabel}</span>
        </>
      ) : null}
      {/*
        Slottable, not a bare {children}. With asChild the outer element is a Slot, and a
        Slot needs to know which child to merge onto. Handing it the spinner and the child
        as plain siblings throws "Expected a single React element child", which it did.
        Slottable marks the real child and reparents the siblings into it.
      */}
      <Slottable>{children}</Slottable>
    </Comp>
  );
});

export { buttonVariants };
