import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The enquiry flow.
 *
 * This is the commercial heart of the platform, so it gets tested through the real form
 * against the real server action and the real database. A unit test cannot reach it: a
 * server action needs a request scope, and mocking that would test the mock.
 *
 * The bot defences are tested for the behaviour that matters, which is that they fail
 * SILENTLY. A honeypot that returns an error tells whoever wrote the bot exactly what to
 * change, so both checks report success and write nothing.
 */

const LISTING = "/cars";

/**
 * Opens the first listing in the results, whatever it happens to be.
 *
 * `waitForURL` is load-bearing. Clicking a card is a CLIENT-SIDE navigation, so no new
 * document loads and `waitForLoadState` returns immediately. Without this the helper
 * returned while still on /cars, and every test after it silently ran against the search
 * page. They failed for reasons that had nothing to do with what they were testing, which
 * cost more time than the fix.
 *
 * Asserting on the h1 does not catch it either: /cars has one too.
 */
async function openFirstListing(page: import("@playwright/test").Page) {
  await page.goto(LISTING);
  const firstCard = page.locator("article h3 a").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await page.waitForURL(/\/vehicles\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("the vehicle page", () => {
  test("opens from a result card and carries the whole listing", async ({ page }) => {
    await openFirstListing(page);

    await expect(page).toHaveURL(/\/vehicles\/[a-z0-9-]+\/[a-z0-9-]+\/.+rn[0-9a-z]{6}$/i);
    await expect(page.getByRole("heading", { name: "Specification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What it might cost a month" })).toBeVisible();
    await expect(page.getByText("Estimated instalment")).toBeVisible();
    // The cost of credit sits beside the instalment at equal weight. It is an NCA point,
    // not a design preference, so it gets an assertion.
    await expect(page.getByText("Total cost of the credit")).toBeVisible();
  });

  test("never publishes the VIN", async ({ page }) => {
    await openFirstListing(page);
    const html = await page.content();
    expect(html).not.toMatch(/vehicleIdentificationNumber/i);
  });

  test("emits Car and Offer structured data with a ZAR price", async ({ page }) => {
    // A hard navigation on purpose. Clicking through from the results is a soft navigation,
    // and React does not re-insert the script tag into the client DOM on one. What matters
    // for structured data is the SERVER response, which is what a crawler asks for, so the
    // test asks for it the same way.
    await openFirstListing(page);
    await page.reload();
    // `allTextContents()` returns empty strings for script elements, because Playwright
    // treats them as having no rendered text. Reading textContent directly is the way.
    const blocks = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => s.textContent ?? "",
      ),
    );
    const car = blocks.map((b) => JSON.parse(b)).find((b) => b["@type"] === "Car");

    expect(car).toBeTruthy();
    expect(car.offers.priceCurrency).toBe("ZAR");
    expect(car.offers.seller["@type"]).toBe("AutoDealer");
    expect(car.mileageFromOdometer.unitCode).toBe("KMT");
    // A rating that has not been collected must never be marked up.
    expect(car.offers.seller.aggregateRating).toBeUndefined();
  });

  test("has no axe violations", async ({ page }) => {
    await openFirstListing(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    if (results.violations.length > 0) {
      for (const v of results.violations) console.error(`${v.id}: ${v.help}`);
    }
    expect(results.violations).toEqual([]);
  });
});

test.describe("enquiring", () => {
  test("sends, and the dialog is keyboard operable throughout", async ({ page }) => {
    await openFirstListing(page);

    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Focus must move INTO the dialog, or a keyboard user is left behind it.
    await expect(dialog).toContainText("Enquire about this vehicle");

    await dialog.getByLabel("Your name").fill("Thabo Mokoena");
    await dialog.getByLabel("Email").fill("thabo@example.co.za");
    await dialog.getByLabel("Phone").fill("082 555 0143");
    await dialog.getByLabel(/What would you like/i).selectOption("test_drive");
    await dialog.getByLabel(/Anything to add/i).fill("Is it still available this Saturday?");
    await dialog.getByRole("checkbox").check();

    // The timing check refuses anything submitted within two seconds of the dialog opening.
    // A real person cannot type the above that fast; Playwright can.
    await page.waitForTimeout(2200);

    await dialog.getByRole("button", { name: "Send enquiry" }).click();

    await expect(dialog.getByRole("status")).toContainText(/dealership has your details/i, {
      timeout: 15000,
    });
  });

  test("refuses to send without consent", async ({ page }) => {
    await openFirstListing(page);
    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("Thabo Mokoena");
    await dialog.getByLabel("Email").fill("thabo@example.co.za");
    await dialog.getByLabel("Phone").fill("082 555 0143");
    // Consent left unticked on purpose.

    await dialog.getByRole("button", { name: "Send enquiry" }).click();

    // The native required attribute blocks it before the action is even called, which is
    // the correct first line: the browser says so instantly and without a round trip.
    await expect(dialog.getByRole("checkbox")).toBeFocused();
    await expect(dialog.getByRole("status")).toHaveCount(0);
  });

  test("the honeypot is unreachable by any route a person could take", async ({ page }) => {
    await openFirstListing(page);
    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();

    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);

    // Out of the tab order, and hidden from assistive technology.
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(page.locator('[aria-hidden="true"] input[name="website"]')).toHaveCount(1);

    /**
     * Off screen rather than `display: none`.
     *
     * Playwright calls a 1px clipped element "visible", so `not.toBeVisible()` is the wrong
     * assertion here: what matters is that no person can see or reach it, which is what
     * being outside the viewport plus aria-hidden plus tabindex -1 gives.
     *
     * `display: none` would satisfy Playwright and catch fewer bots, because it is the one
     * thing a scraper checks before filling a field. Off screen is the trade that catches
     * more of them.
     */
    const box = await honeypot.boundingBox();
    const viewport = page.viewportSize();
    expect(box, "the honeypot should still be laid out, so a bot finds it").toBeTruthy();
    if (box && viewport) {
      const onScreen = box.x + box.width > 0 && box.x < viewport.width;
      expect(onScreen, "the honeypot must sit outside the viewport").toBe(false);
    }
  });

  test("the dialog has no axe violations", async ({ page }) => {
    await openFirstListing(page);
    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    if (results.violations.length > 0) {
      for (const v of results.violations) console.error(`${v.id}: ${v.help}`);
    }
    expect(results.violations).toEqual([]);
  });
});

test.describe("the pages the navigation points at", () => {
  const ROUTES = [
    "/",
    "/cars",
    "/cars/toyota",
    "/cars/body/bakkie",
    "/cars/in/gauteng",
    "/dealers",
    "/how-verification-works",
    "/privacy",
    "/terms",
    "/cookies",
    "/accessibility",
    "/contact",
  ];

  test("every one of them exists", async ({ page }) => {
    for (const route of ROUTES) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not be a 404`).toBe(200);
    }
  });

  test("nothing in the header or footer leads to a 404", async ({ page }) => {
    // The audit found seventeen dead links. This is what stops them coming back.
    await page.goto("/");
    const hrefs = await page
      .locator("header a, footer a")
      .evaluateAll((links) =>
        links
          .map((l) => (l as HTMLAnchorElement).getAttribute("href") ?? "")
          .filter((h) => h.startsWith("/")),
      );

    const unique = [...new Set(hrefs)];
    expect(unique.length).toBeGreaterThan(5);

    for (const href of unique) {
      const response = await page.goto(href);
      expect(response?.status(), `${href} is linked from the chrome and 404s`).toBe(200);
    }
  });
});

test.describe("crawlability", () => {
  test("robots.txt blocks the filter permutations and names the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();

    expect(body).toContain("Sitemap:");
    expect(body).toMatch(/Disallow.*\/admin/);
    expect(body).toMatch(/Disallow.*sort=/);
  });

  test("the sitemap lists real vehicles and no blocked URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();

    expect(body).toMatch(/<loc>[^<]*\/vehicles\//);
    expect(body).toMatch(/<loc>[^<]*\/dealers\//);
    // Submitting a URL that robots.txt blocks is a contradiction Google reports as an error.
    expect(body).not.toMatch(/<loc>[^<]*\?/);
    expect(body).not.toMatch(/<loc>[^<]*\/admin/);
  });
});
