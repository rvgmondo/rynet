import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { renderEverything } from "./axe-context";

/**
 * The home page search: say the car, the floor lights up.
 *
 * What has to stay true, whatever the floor looks like:
 *   1. The number on the button is the number /cars shows when it is pressed.
 *   2. Removing a chip removes its words from the box, so the box never says more than is applied.
 *   3. A close call's "+N" is real: following it finds that many more.
 *   4. With JavaScript off it is still a search form that reaches /cars.
 *   5. It passes axe with an answer on screen, chips, close calls and all.
 */

/**
 * The first answer after a server starts fills the stock and taxonomy caches, which is slower than
 * the default wait on a busy machine. Every later answer is quick.
 */
const FIRST_ANSWER = { timeout: 20_000 };

const count = (label: string | null) => Number((label ?? "").replace(/[^\d]/g, ""));

test.describe("the floor", () => {
  test("the count on the button is the count /cars shows", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: /describe the car/i });
    await box.fill("diesel bakkie");

    const button = page.locator(".rn-floor__go");
    await expect(button).toHaveText(/^Show \d+/, FIRST_ANSWER);
    const promised = count(await button.textContent());
    expect(promised).toBeGreaterThan(0);

    // The words come back as chips, in the site's own names.
    await expect(page.locator(".rn-floor__pill", { hasText: "Diesel" })).toBeVisible();
    await expect(page.locator(".rn-floor__pill", { hasText: "Bakkie" })).toBeVisible();

    await button.click();
    await expect(page).toHaveURL(/\/cars\?q=diesel\+bakkie/);
    await expect(page.locator("h1#results-heading + p")).toContainText(String(promised));
  });

  test("a slip is read as the word meant, and says so", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: /describe the car/i }).fill("deisel");
    await expect(page.locator(".rn-floor__pill", { hasText: 'you typed "deisel"' })).toBeVisible(
      FIRST_ANSWER,
    );
  });

  test("removing a chip removes its words", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: /describe the car/i });
    await box.fill("automatic diesel bakkie");
    await expect(page.getByRole("button", { name: "Remove Automatic" })).toBeVisible(FIRST_ANSWER);
    await page.getByRole("button", { name: "Remove Automatic" }).click();
    await expect(box).toHaveValue("diesel bakkie");
    await expect(page.getByRole("button", { name: "Remove Automatic" })).toHaveCount(0);
  });

  test("a close call finds exactly as many more as it says", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: /describe the car/i });
    // A ceiling below almost everything, so the answer is thin and a stretch is offered.
    await box.fill("diesel bakkie under 120k");
    const button = page.locator(".rn-floor__go");
    await expect(button).toHaveText(/^Show \d+/, FIRST_ANSWER);
    const before = count(await button.textContent());

    const call = page.locator(".rn-floor__calls .rn-floor__try").first();
    await expect(call).toBeVisible();
    const gain = count(await call.locator("span").first().textContent());
    await call.click();
    await expect(button).toHaveText(
      `Show ${before + gain} ${before + gain === 1 ? "car" : "cars"}`,
    );
  });

  test("with JavaScript off it is still a search", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#floor-q").fill("bakkie");
    await page.locator(".rn-floor__go").click();
    await expect(page).toHaveURL(/\/cars\?q=bakkie/);
    await context.close();
  });

  test("has no axe violations with an answer on screen", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("searchbox", { name: /describe the car/i })
      .fill("diesel bakkie under 120k");
    await expect(page.locator(".rn-floor__calls")).toBeVisible(FIRST_ANSWER);
    await renderEverything(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const v of results.violations) {
      console.error(`\n${v.id} (${v.impact}): ${v.help}`);
      for (const node of v.nodes) console.error(`  ${node.target.join(" ")}`);
    }
    expect(results.violations).toEqual([]);
  });
});
