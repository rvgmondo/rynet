import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * TextLink: the two link styles, and the only two.
 *
 *   action  red words and an arrow that moves on hover, for a section's next step
 *           <TextLink href="/cars" variant="action">See all their stock</TextLink>
 *   inline  heading ink, semibold, a quiet underline that turns red on hover, for a link inside
 *           a sentence, a notice, a caption, a card or a form, and for an email address
 *           <TextLink href="/how-verification-works">How we check</TextLink>
 *
 * Styling is `.rn-link-arrow` and `.rn-link` in globals.css, so markup that cannot use the
 * component (a <summary>, a mailto on a plain <a>) puts the class on itself. A `mailto:`, `tel:`
 * or `#` href renders a plain <a>, since next/link has nothing to prefetch there.
 */
export function TextLink({
  href,
  variant = "inline",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: "action" | "inline";
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"a">, "href" | "className" | "children">) {
  const classes = `${variant === "action" ? "rn-link-arrow" : "rn-link"} ${className}`.trim();
  const content =
    variant === "action" ? (
      <>
        {children}
        <ArrowRight aria-hidden="true" />
      </>
    ) : (
      children
    );

  if (/^(mailto:|tel:|#)/.test(href)) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}
