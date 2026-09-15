import { expect, test } from "@playwright/test";

/**
 * Reduced motion: remove the travel, keep the state.
 *
 * The policy is that every animation in the stylesheet runs FROM a synthetic state TO the
 * element's own resting style, so switching animation off leaves the element correct.
 * A blanket `* { animation: none }` without that discipline is how a reduced-motion site
 * ends up with half its elements stuck at opacity zero, and nobody notices for months
 * because the people who would notice are the ones who set the preference.
 *
 * These tests are the assertion that stops it rotting. They are deliberately not a check
 * that animations are disabled: they check that the page still SAYS everything it says.
 */

// Emulated on the browser context, which is where this Playwright version types it.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const PAGES = ["/", "/cars", "/dealers"];

for (const path of PAGES) {
  test.describe(`${path} with reduced motion`, () => {
    test("nothing is left invisible", async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(400);

      const hidden = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll("main *")) {
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;

          // A deliberately hidden element has no size; the failure being hunted is a
          // full-size element left at zero. The threshold is near-zero rather than
          // anything below one, because plenty of the design is deliberately translucent:
          // a gauge track at 0.22, a redline at 0.55, a disabled facet row at 0.6.
          const box = el.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) continue;
          if (Number.parseFloat(style.opacity) < 0.05) {
            // SVG elements carry an SVGAnimatedString rather than a plain class name.
            out.push(`${el.tagName}.${el.getAttribute("class") ?? ""}`.slice(0, 70));
          }
        }
        return out;
      });

      expect(hidden, "elements left transparent by an animation that never ran").toEqual([]);
    });

    test("no structural rule is left collapsed", async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(400);

      const rules = page.locator(".rn-rule");
      const count = await rules.count();
      if (count === 0) return;

      const scales = await rules.evaluateAll((nodes) =>
        nodes.map((node) => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
          return matrix.a;
        }),
      );
      for (const scale of scales) expect(scale).toBeCloseTo(1, 2);
    });
  });
}

test("a listing with no photograph still says what it is, never a blank box", async ({ page }) => {
  /*
   * The no-photograph state replaced the colour plate and its mileage gauge. What has to hold
   * with animation off is the same thing the gauge test held: the placeholder is not an empty
   * rectangle. It carries the car's recorded colour name when there is one, and always says that
   * photographs are coming.
   *
   * The seed leaves about one listing in twelve without photographs, so this walks the first
   * three pages of results to collect a sample worth asserting on.
   */
  const placeholders: { text: string; visible: boolean }[] = [];

  for (const page_ of [1, 2, 3]) {
    await page.goto(page_ === 1 ? "/cars" : `/cars?page=${page_}`);
    await page.waitForTimeout(400);
    placeholders.push(
      ...(await page.locator("article .rn-noimage").evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node);
          return {
            text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
            visible: style.visibility !== "hidden" && Number.parseFloat(style.opacity) > 0.9,
          };
        }),
      )),
    );
  }

  expect(
    placeholders.length,
    "no listing without a photograph, so nothing was tested",
  ).toBeGreaterThan(0);
  for (const placeholder of placeholders) {
    expect(placeholder.visible, "a placeholder was left transparent").toBe(true);
    expect(placeholder.text).toContain("Photos coming soon");
  }
});

test("a card still answers focus, because feedback is not motion", async ({ page }) => {
  /*
   * The previous design flipped a card to ink on hover and focus. SHOWROOM lifts it and deepens
   * its shadow. Reduced motion removes the lift; the shadow change is not vestibular motion and
   * must survive, or a keyboard user on a reduced-motion setting gets no sign of where they are
   * beyond the ring.
   */
  await page.goto("/cars");

  const card = page.locator("article.rn-card").first();
  const before = await card.evaluate((el) => getComputedStyle(el).boxShadow);

  await card.locator("a").first().focus();
  await page.waitForTimeout(200);

  const after = await card.evaluate((el) => ({
    shadow: getComputedStyle(el).boxShadow,
    transform: getComputedStyle(el).transform,
  }));
  expect(after.shadow, "the focus state must survive reduced motion").not.toBe(before);
  expect(after.transform === "none" || after.transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
});
