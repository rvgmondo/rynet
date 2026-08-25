import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Phase 1 smoke suite.
 *
 * Covers the three things the brief will not let us claim without evidence: no axe
 * violations, no horizontal overflow at any tested width, and the theme system resolving in
 * all three of its states.
 *
 * Deliberately not a screenshot suite. Visual regression lands with the component library
 * in Phase 1b, where there are baselines worth comparing against.
 */

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/cars", name: "search" },
  { path: "/cars?make=toyota&body=bakkie&sort=price-asc", name: "search filtered" },
];

// 320 is the floor the brief sets. 1920 is the ceiling. The three in between are the
// widths where layouts actually break.
const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

test.describe("accessibility", () => {
  for (const route of ROUTES) {
    test(`${route.name} has no axe violations`, async ({ page }) => {
      await page.goto(route.path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      // Print the detail before asserting, so a failure names the rule and the element
      // rather than just a count.
      if (results.violations.length > 0) {
        for (const v of results.violations) {
          console.error(`\n${v.id} (${v.impact}): ${v.help}`);
          for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
        }
      }
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("responsive", () => {
  for (const route of ROUTES) {
    test(`${route.name} never scrolls sideways`, async ({ page }) => {
      await page.goto(route.path);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);

        // A wide child is fine as long as it scrolls inside its own box rather than pushing
        // the page. This catches what the number above cannot: content that has escaped its
        // container but happens not to extend the document.
        //
        // `checkVisibility` is load-bearing here. Without it this fires on content inside a
        // closed `<details>`, which Chromium still gives layout boxes to and which nobody
        // can see.
        const escaping = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          return [...document.querySelectorAll("body *")]
            .filter((el) => {
              if (!el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true })) {
                return false;
              }
              const r = el.getBoundingClientRect();
              if (r.width === 0) return false;
              if (r.right <= vw + 1) return false;
              const parent = el.parentElement;
              if (!parent) return false;
              if (parent.getBoundingClientRect().right > vw + 1) return false;
              return getComputedStyle(parent).overflowX !== "auto";
            })
            .map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 40)}`);
        });
        expect(escaping, `elements escaping the viewport at ${width}px`).toEqual([]);
      }
    });
  }
});

const LIGHT = "rgb(255, 255, 255)";
const DARK = "rgb(0, 17, 35)";

const bodyBg = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("theme", () => {
  /**
   * The theme has two layers and they need testing separately, because the first version of
   * this test conflated them and failed for the wrong reason.
   *
   * next-themes always resolves "system" to a concrete `data-theme` attribute once it
   * hydrates. So the `prefers-color-scheme` media query in tokens.css is NOT what drives a
   * hydrated page. It is the pre-hydration and no-JavaScript fallback, and it matters
   * precisely because it is what a visitor sees in the first paint.
   */

  test("CSS alone follows the operating system, with no JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await bodyBg(page), "light OS, no JS").toBe(LIGHT);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await bodyBg(page), "dark OS, no JS").toBe(DARK);

    await context.close();
  });

  test("a hydrated page follows the operating system by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect
      .poll(() => bodyBg(page), { message: "dark OS should resolve to the dark palette" })
      .toBe(DARK);
  });

  test("an explicit choice beats the operating system, in both directions", async ({ page }) => {
    // Dark OS, visitor picks light.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();
    await expect
      .poll(() => bodyBg(page), { message: "explicit light beats a dark OS" })
      .toBe(LIGHT);

    // Light OS, visitor picks dark.
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect.poll(() => bodyBg(page), { message: "explicit dark beats a light OS" }).toBe(DARK);
  });
});

test.describe("search", () => {
  test("filters, sorts and paginates through the URL", async ({ page }) => {
    await page.goto("/cars?make=toyota&body=bakkie&sort=price-asc");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Cars for sale");

    // The count is announced, so it must be in a live region.
    const live = page.locator('[aria-live="polite"]').first();
    await expect(live).toContainText("verified dealerships");

    // Prices ascend.
    const prices = await page
      .locator("article .font-display")
      .allTextContents()
      .then((texts) => texts.map((t) => Number(t.replace(/[^\d]/g, ""))));
    expect(prices.length).toBeGreaterThan(0);
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1] as number);
    }

    // Page two keeps every filter. Dropping them here is the single most common bug on a
    // faceted search, so it gets its own assertion.
    const next = page.locator('a[rel="next"]').first();
    await expect(next).toHaveAttribute("href", /make=toyota/);
    await expect(next).toHaveAttribute("href", /body=bakkie/);
    await expect(next).toHaveAttribute("href", /sort=price-asc/);
  });

  test("empty state explains itself and offers a way out", async ({ page }) => {
    await page.goto("/cars?make=toyota&minPrice=9000000");
    await expect(page.getByText("No cars match that combination")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear all filters" })).toBeVisible();
  });
});

test.describe("the hard rule", () => {
  test("no private-seller route exists anywhere in the navigation", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("a")
      .evaluateAll((links) =>
        links.map((l) => (l as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
    // "Sell to a dealer" is a trade-in valuation that routes to a dealership. A route that
    // implies a private listing must never appear.
    const forbidden = hrefs.filter((h) => /sell-your-car|list-my-car|place-an-ad|private/i.test(h));
    expect(forbidden).toEqual([]);
  });
});

test.describe("mobile navigation", () => {
  /**
   * The first version of the header hid the navigation behind `lg:block` with nothing to
   * open it, so every mobile visitor had no navigation at all. On a South African car
   * marketplace that is the majority of traffic, so this gets its own test rather than
   * relying on someone noticing.
   */
  test("the menu opens, is keyboard operable, and does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/");

    const menu = page.locator("header details");
    const summary = page.getByLabel("Open menu");

    // Reachable and operable from the keyboard alone.
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("open", "");

    // Every navigation destination is now reachable on a phone. Scoped to the header,
    // because the footer carries its own links with overlapping names and an unscoped
    // locator matches both.
    const headerNav = page.getByRole("banner").getByRole("navigation", { name: "Menu" });
    for (const label of ["Find a car", "Dealerships", "Finance", "Sell to a dealer", "Advice"]) {
      await expect(headerNav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    // And so is signing in, which the desktop header shows and the mobile one used to hide.
    await expect(headerNav.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

    // Open at the narrowest supported width, still no sideways scroll.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "overflow with the mobile menu open at 320px").toBeLessThanOrEqual(0);

    await page.keyboard.press("Enter");
    await expect(menu).not.toHaveAttribute("open", "");
  });
});
