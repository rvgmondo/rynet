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
    expect(css, "the prose face is not declared").toMatch(/font-family:\s*Newsreader/);

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
      .locator(".rn-figure")
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
          `font-family:${fontFamily};font-weight:800;font-size:40px;line-height:1;` +
          `font-variant-numeric:${tabular ? "tabular-nums" : "normal"};` +
          "font-variation-settings:'wdth' 118;" +
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
