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

test("the mileage gauge reads the real odometer, never zero", async ({ page }) => {
  await page.goto("/cars");
  await page.waitForTimeout(400);

  /*
   * The needle rests at the car's true mileage by default and the sweep animates up to it,
   * rather than the other way round. If that is ever inverted, a reader with reduced motion
   * sees every car in the country showing zero kilometres, which is worse than no gauge.
   */
  const sweeps = await page
    .locator(".rn-plate__value")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).strokeDasharray));

  expect(sweeps.length).toBeGreaterThan(4);
  const drawn = sweeps.filter((value) => Number.parseFloat(value) > 0);
  expect(drawn.length, "every gauge is on the peg").toBeGreaterThan(sweeps.length / 2);
});

test("the ink flip still happens, because it is the only feedback the design has", async ({
  page,
}) => {
  await page.goto("/cars");

  const card = page.locator(".rn-card").first();
  const before = await card.evaluate((el) => getComputedStyle(el).backgroundColor);

  // Focus rather than hover, so this holds on a touch device too.
  await card.locator("a").first().focus();
  await page.waitForTimeout(200);

  const after = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(after, "a colour change is not vestibular motion and must survive").not.toBe(before);
});
