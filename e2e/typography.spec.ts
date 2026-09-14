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
  test("the display face is actually served, with its files", async ({ request }) => {
    /*
     * The part of this that is true everywhere, so it is asserted everywhere.
     *
     * A font subsetting change that drops the files, or a build that silently ships only the
     * metric-matched fallback, is the regression worth catching, and it is visible in the
     * served CSS without a browser: the @font-face rules and the woff2 they point at either
     * exist or they do not.
     */
    const home = await (await request.get("/")).text();
    const href = home.match(/href="(\/_next\/static\/chunks\/[^"]+\.css[^"]*)"/)?.[1];
    expect(href, "no stylesheet on the home page").toBeTruthy();

    const css = await (await request.get(href as string)).text();
    expect(css, "no @font-face rules were emitted at all").toContain("@font-face");
    expect(css, "the display face is not declared").toMatch(/font-family:\s*Archivo/);
    // One family. Newsreader was the previous design's prose serif and must not creep back in,
    // because a second family is another font download on every page.
    expect(css, "a second family is declared").not.toMatch(/font-family:\s*Newsreader/);

    /*
     * The url() carries a `?dpl=` cache-busting query, and the path is relative to the
     * stylesheet rather than to the site root, so both have to be handled: the first regex
     * that ignored either matched nothing and the test failed for the wrong reason.
     */
    const sources = [...css.matchAll(/url\(([^)]*\.woff2[^)]*)\)/g)].map((m) =>
      (m[1] as string).replace(/^["']|["']$/g, ""),
    );
    expect(sources.length, "no woff2 files are referenced").toBeGreaterThan(2);

    for (const src of sources.slice(0, 4)) {
      const absolute = new URL(src, new URL(href as string, "http://localhost")).pathname;
      const file = await request.get(absolute + new URL(src, "http://localhost/x/").search);
      expect(file.status(), `${src} is declared but not served`).toBe(200);
    }
  });

  test("tabular figures survive the font subset", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "networkidle" });

    const family = await page
      .locator(".rn-price")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family, "prices are not set in the display face").toMatch(/Archivo/i);

    await page.evaluate(() => document.fonts.ready);

    /*
     * South African prices group thousands with a space, "R 249 900", so with proportional
     * figures the digit widths jitter card to card and a column of twenty-four prices never
     * aligns, at exactly the moment the grid is meant to read expensive.
     *
     * The probe is measured twice: once in the page's own stack, and once in a stack with
     * the display face removed. If those two agree, the browser is rendering the
     * metric-matched fallback and no measurement here says anything about the shipped font.
     * That happens in sandboxes that cannot reach the font files, and a gate that goes red
     * for that reason is a gate people learn to ignore. The test above is the part that
     * holds everywhere; this one skips loudly rather than lying.
     */
    const measured = await page.evaluate((stack) => {
      const probe = (fontFamily: string, text: string, tabular: boolean) => {
        const el = document.createElement("span");
        // Longhand, never the `font` shorthand: the shorthand resets font-variant-numeric to
        // normal, which would strip the very feature this test exists to prove.
        el.style.cssText =
          `font-family:${fontFamily};font-weight:700;font-size:40px;line-height:1;` +
          `font-variant-numeric:${tabular ? "tabular-nums" : "normal"};` +
          "position:absolute;visibility:hidden;white-space:pre";
        el.textContent = text;
        document.body.append(el);
        const width = el.getBoundingClientRect().width;
        el.remove();
        return width;
      };

      const withoutDisplay = stack.split(",").slice(1).join(",").trim() || "sans-serif";
      return {
        withoutDisplay,
        ones: probe(stack, "111", true),
        zeros: probe(stack, "000", true),
        eights: probe(stack, "888", true),
        fallbackOnes: probe(withoutDisplay, "111", true),
        fallbackZeros: probe(withoutDisplay, "000", true),
      };
    }, family);

    const usingFallback =
      Math.abs(measured.ones - measured.fallbackOnes) < 0.5 &&
      Math.abs(measured.zeros - measured.fallbackZeros) < 0.5;

    test.skip(
      usingFallback,
      `The display face did not load in this browser, so the page stack (${measured.ones}px and ` +
        `${measured.zeros}px) measures the same as the fallback stack (${measured.withoutDisplay}). ` +
        `Nothing here would be a statement about the shipped font. The served-files test above ` +
        `covers the regression this one exists for.`,
    );

    expect(Math.abs(measured.ones - measured.zeros)).toBeLessThan(0.5);
    expect(Math.abs(measured.ones - measured.eights)).toBeLessThan(0.5);
  });

  test("every price on a results page is set in tabular figures", async ({ page }) => {
    await page.goto("/cars");
    const figures = page.locator(".rn-price");
    await expect(figures.first()).toBeVisible();

    const settings = await figures.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontVariantNumeric),
    );
    expect(settings.length).toBeGreaterThan(4);
    for (const value of settings) expect(value).toContain("tabular-nums");
  });
});

test.describe("the page headline never overflows", () => {
  /*
   * The previous design sized an expanded display headline from its container, and this test
   * held it to filling at least 80 percent of the measure. SHOWROOM sets headings on a fixed fluid
   * scale at normal width, so filling the measure is no longer the intent. What is still worth
   * failing the build for is a headline that escapes its column or pushes the page sideways at
   * any breakpoint the design names.
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

      const headline = page.locator("main h1").first();
      const box = await headline.boundingBox();
      const container = await headline.evaluate((el) =>
        (el.parentElement as HTMLElement).getBoundingClientRect(),
      );
      expect(box, "no headline on the home page").not.toBeNull();
      if (!box) return;

      expect(box.x).toBeGreaterThanOrEqual(container.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(container.x + container.width + 1);
    });
  }
});
