"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import * as React from "react";

import {
  type ButtonBlock,
  type ButtonSize,
  type ButtonVariant,
  buttonClasses,
} from "@/components/ui/button-classes";

/**
 * Button.
 *
 *   primary    solid red (#C81E2B, white text at 5.71:1). The one action that matters.
 *   secondary  solid navy.
 *   outline    white with a 3:1 border. The tertiary action.
 *   ghost      no fill until hovered.
 *   link       an underlined red word, for inline actions.
 *
 * Sizes sm, md and lg are 44, 48 and 56px tall, so every size meets the 44px target. Pass
 * `block="mobile"` for a primary action that should run full width on a phone.
 *
 * Three details are deliberate and predate this design:
 *
 * 1. Loading disables without collapsing. `aria-busy` announces the state, the label stays in
 *    the flow so the button does not change width, and the spinner takes the icon slot.
 * 2. Disabled uses aria-disabled as well as the attribute, so a keyboard user can still reach a
 *    non-submit button and discover why it is unavailable.
 * 3. `asChild` renders the child element (a Link) with the button's classes. A server component
 *    that does not need the ref can use `buttonClasses()` directly and skip the client boundary.
 */
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: ButtonBlock;
  /** Render as the child element, for links that should look like buttons. */
  asChild?: boolean;
  isLoading?: boolean;
  /** Announced while loading. Without it a screen reader hears nothing change. */
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
      className={buttonClasses({ variant, size, block, className })}
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
      {/* Slottable, not a bare {children}: with asChild the Slot needs to know which child is
          the real element, or it throws "Expected a single React element child". */}
      <Slottable>{children}</Slottable>
    </Comp>
  );
});

export { buttonClasses };
