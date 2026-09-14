import type { ElementType, ReactNode } from "react";

/**
 * Container. 1280px of content with fluid side padding (16px on a phone, 32px on a desktop).
 * `narrow` is an 832px column for forms, legal pages and long reading.
 *
 * Equivalent to the `container-page` and `container-narrow` utilities, which remain for markup
 * that cannot take a component.
 */
export function Container({
  as: Tag = "div",
  size = "default",
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  size?: "default" | "narrow";
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag
      className={`${size === "narrow" ? "container-narrow" : "container-page"} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
