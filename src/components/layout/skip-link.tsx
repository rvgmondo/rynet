/**
 * Skip link.
 *
 * Visually hidden until focused, then it lands in the top-left as a real, visible control.
 * Without one, a keyboard user tabs through the entire header, including every navigation
 * item, on every single page before reaching the content. WCAG 2.2 SC 2.4.1.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[700] focus:rounded-md focus:bg-accent-solid focus:px-4 focus:py-3 focus:font-semibold focus:text-ink-on-accent"
    >
      Skip to content
    </a>
  );
}
