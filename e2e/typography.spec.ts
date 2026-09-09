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
    await page.goto("/cars", { waitUntil: "networkidle" });

    /*
     * Read the family off a real price, and prove the REAL face is what loaded.
     *
     * Measuring a stack that has silently fallen back is how this check passes on a warm
     * cache and fails on a cold one: the metric-matched fallback has proportional digits, so
     * the probe reports a three pixel difference and the failure looks like a lost OpenType
     * feature when it is really a font that had not arrived yet.
     *
     * Note `document.fonts.ready` and NOT `document.fonts.load`. A next/font stack is
     * `__Archivo_hash, __Archivo_Fallback_hash, "Archivo", system-ui, sans-serif`, and
     * `load()` rejects with a NetworkError as soon as one family in the list has no face to
     * fetch, which three of those never will. `ready` settles instead of throwing, and
     * `check()` then answers the question that actually matters.
     */
    const family = await page
      .locator(".rn-figure")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family, "prices are not set in the display face").toMatch(/Archivo/i);

    const loaded = await page.evaluate(async (stack) => {
      await document.fonts.ready;
      const first = (stack.split(",")[0] ?? stack).trim().replace(/^["']|["']$/g, "");
      return { first, available: document.fonts.check(`800 40px "${first}"`) };
    }, family);

    expect(
      loaded.available,
      `the real ${loaded.first} face never loaded, so any measurement here would be of the metric-matched fallback rather than of the shipped font`,
    ).toBe(true);

    /*
     * South African prices group thousands with a space, "R 249 900", so with proportional
     * figures the digit widths jitter card to card and a column of twenty-four prices never
     * aligns, at exactly the moment the grid is meant to read expensive.
     *
     * The probe is measured twice: once in the page's own stack, and once in a stack with
     * the display face removed. If those two agree, the first measurement was of the
     * fallback and the failure has nothing to do with the OpenType feature, which is a
     * distinction the failure message has to make or the next person debugs the wrong thing.
     */
    const measured = await page.evaluate((stack) => {
      const probe = (family: string, text: string, tabular: boolean) => {
        const el = document.createElement("span");
        /*
         * Set longhand, never the `font` shorthand. The shorthand resets
         * font-variant-numeric to normal, which would strip the very feature this test
         * exists to prove, and the test would then fail against a perfectly good font.
         */
        el.style.cssText =
          `font-family:${family};font-weight:800;font-size:40px;line-height:1;` +
          `font-variant-numeric:${tabular ? "tabular-nums" : "normal"};` +
          "font-variation-settings:'wdth' 118;" +
          "position:absolute;visibility:hidden;white-space:pre";
        el.textContent = text;
        document.body.append(el);
        const width = el.getBoundingClientRect().width;
        el.remove();
        return width;
      };

      // Everything after the first family, which is what the browser would have used had
      // the display face never arrived.
      const withoutDisplay = stack.split(",").slice(1).join(",").trim() || "sans-serif";

      return {
        stack,
        withoutDisplay,
        ones: probe(stack, "111", true),
        zeros: probe(stack, "000", true),
        eights: probe(stack, "888", true),
        untabbedOnes: probe(stack, "111", false),
        untabbedZeros: probe(stack, "000", false),
        fallbackOnes: probe(withoutDisplay, "111", true),
        fallbackZeros: probe(withoutDisplay, "000", true),
      };
    }, family);

    const detail =
      `measured in ${measured.stack}: 111 is ${measured.ones}px and 000 is ${measured.zeros}px. ` +
      `Without tabular-nums the same pair is ${measured.untabbedOnes} and ${measured.untabbedZeros}. ` +
      `In the fallback stack (${measured.withoutDisplay}) it is ${measured.fallbackOnes} and ` +
      `${measured.fallbackZeros}. If the first pair matches the fallback pair, the display ` +
      `face is not being used and the OpenType feature is not the problem.`;

    expect(Math.abs(measured.ones - measured.zeros), detail).toBeLessThan(0.5);
    expect(Math.abs(measured.ones - measured.eights), detail).toBeLessThan(0.5);
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
