import type { Page } from "@playwright/test";

/**
 * Turn off the layout optimisation before an axe scan, and only for the scan.
 *
 * Cards and the bands below the fold carry `content-visibility: auto`, which is what took
 * the search page's first paint from 2532ms to just over 2000ms on a throttled mid-range
 * Android. It skips LAYOUT for what is off screen. It does not change a single colour.
 *
 * axe cannot see that. Its contrast rule works out an element's background by hit testing
 * the point the element sits at, and a skipped subtree does not answer a hit test, so axe
 * reports whatever it found instead. On the search page that is the card's city line, which
 * sits at 5.5:1 against the card it is on, reported as a failure at a ratio axe never
 * actually measured. It only appears under load, because the cards nearest the viewport are
 * rendered before axe runs and the rest are not, which is exactly the kind of failure that
 * gets muted as flake rather than understood.
 *
 * So the scan turns the optimisation off and then checks every card on the page, which is
 * more than it was checking before. Scrolling to force rendering does not work: the moment
 * a card leaves the viewport it is skipped again.
 */
const SHOW_EVERYTHING = "*, *::before, *::after { content-visibility: visible !important; }";

export async function renderEverything(page: Page): Promise<void> {
  await page.addStyleTag({ content: SHOW_EVERYTHING });
}
