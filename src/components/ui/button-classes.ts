/**
 * Button classes, without the client boundary.
 *
 * `<Button>` is a client component because it composes refs through Radix Slot. A server
 * component that only needs a link that LOOKS like a button should not pay for that, so it asks
 * here and puts the classes on its own `<Link>`:
 *
 *     <Link href="/sell-to-a-dealer" className={buttonClasses({ variant: "primary" })}>
 *
 * The styling itself lives in `.rn-btn` in src/styles/globals.css, inside `@layer components`,
 * so any utility written beside it still wins.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";
/** `true` is full width everywhere; "mobile" is full width below 640px only. */
export type ButtonBlock = boolean | "mobile";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "rn-btn--primary",
  secondary: "rn-btn--secondary",
  outline: "rn-btn--outline",
  ghost: "rn-btn--ghost",
  link: "rn-btn--link",
  // Destructive actions use the primary red fill: the danger TEXT colour does not carry white
  // text in the dark theme, and a second red fill would only confuse the one that matters.
  danger: "rn-btn--primary",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "rn-btn--sm",
  md: "",
  lg: "rn-btn--lg",
  icon: "rn-btn--icon",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  block?: ButtonBlock | null;
  className?: string;
} = {}): string {
  return [
    "rn-btn",
    VARIANT[variant ?? "primary"],
    SIZE[size ?? "md"],
    block === true ? "rn-btn--block" : block === "mobile" ? "rn-btn--block-mobile" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
