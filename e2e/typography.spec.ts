import { expect, test } from "@playwright/test";

/**
 * Typography gates.
 *
 * Both of these fail the build rather than a design review, for the same reason the
 * contrast report does: a font pipeline change that quietly drops an OpenType feature, or a
 * headline that starts overflowing at one breakpoint, degrades every page on the platform
 * and nobody can name why the grid looks sloppy a month later.
 */

test.describe("the numerals every price depends on", () => {
  test("tabular figures survive the font subset", async ({ page }) => {
    await page.goto("/cars");

    /*
     * Font subsetting pipelines strip OpenType features silently. South African prices group
     * thousands with a space, "R 249 900", so with proportional figures the digit widths
     * jitter card to card and a column of twenty-four prices never aligns, at exactly the
     * moment the grid is meant to read expensive.
     */
    const widths = await page.evaluate(() => {
      const probe = (text: string) => {
        const el = document.createElement("span");
        el.className = "tabular";
        /*
         * Set longhand, never the `font` shorthand. The shorthand resets
         * font-variant-numeric to normal, which would strip the very feature this test
         * exists to prove, and the test would then fail against a perfectly good font.
         */
        el.style.cssText =
          "font-family:var(--rn-font-display);font-weight:800;font-size:40px;line-height:1;" +
          "font-variant-numeric:tabular-nums;font-variation-settings:'wdth' 118;" +
          "position:absolute;visibility:hidden;white-space:pre";
        el.textContent = text;
        document.body.append(el);
        const width = el.getBoundingClientRect().width;
        el.remove();
        return width;
      };
      return { ones: probe("111"), zeros: probe("000"), eights: probe("888") };
    });

    expect(Math.abs(widths.ones - widths.zeros)).toBeLessThan(0.5);
    expect(Math.abs(widths.ones - widths.eights)).toBeLessThan(0.5);
  });

  test("every price on a results page is set in tabular figures", async ({ page }) => {
    await page.goto("/cars");
    const figures = page.locator(".rn-figure");
    await expect(figures.first()).toBeVisible();

    const settings = await figures.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontVariantNumeric),
    );
    expect(settings.length).toBeGreaterThan(4);
    for (const value of settings) expect(value).toContain("tabular-nums");
  });
});

test.describe("the display headline fills its measure without overflowing it", () => {
  /*
   * The hero is sized from its container divided by the longest line's own character count,
   * because a viewport clamp has no idea how many characters are on the line. That is
   * exactly the kind of arithmetic that is right at one width and wrong at the next, so
   * every breakpoint the design names is checked.
   */
  for (const width of [320, 375, 480, 768, 900, 1024, 1440, 1920]) {
    test(`at ${width}px it stays inside the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scroll: doc.scrollWidth, client: doc.clientWidth };
      });
      expect(overflow.scroll, "the page scrolls sideways").toBeLessThanOrEqual(overflow.client + 1);

      const headline = page.locator("h1.rn-display");
      const box = await headline.boundingBox();
      const container = await headline.evaluate(
        (el) => (el.parentElement as HTMLElement).getBoundingClientRect().width,
      );
      expect(box, "no display headline on the home page").not.toBeNull();
      if (!box) return;

      // Filling the measure is the whole point of the width axis, so under-filling badly is
      // as much a failure as overflowing. Below 480px the axis narrows and the ceiling of
      // the clamp takes over, so only the wide breakpoints are held to the lower bound.
      expect(box.width).toBeLessThanOrEqual(container + 1);
      if (width >= 900) expect(box.width / container).toBeGreaterThan(0.8);
    });
  }
});
