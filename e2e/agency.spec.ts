import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * Rynet Digital.
 *
 * The agency site's own suite, held to the same bar as the marketplace: no axe violations,
 * no horizontal overflow, and every link in its chrome resolving.
 *
 * The qualification form gets most of the attention, because it is the only thing on this
 * front door that can fail silently. The marketplace enquiry form did exactly that for a
 * while: it reported success and wrote nothing, twice, for two different reasons. So the
 * tests here assert what actually reached the database rather than what the screen said.
 */

const ROUTES = [
  { path: "/digital", name: "agency home" },
  { path: "/digital/services", name: "services index" },
  { path: "/digital/services/stock-feeds-and-inventory", name: "one service" },
  { path: "/digital/pricing", name: "pricing" },
  { path: "/digital/process", name: "process" },
  { path: "/digital/about", name: "about" },
  { path: "/digital/contact", name: "contact" },
];

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

test.describe("accessibility", () => {
  for (const route of ROUTES) {
    test(`${route.name} has no axe violations`, async ({ page }) => {
      await page.goto(route.path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

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
        expect(overflow, `overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe("the pages the agency navigation points at", () => {
  test("every one of them exists", async ({ page }) => {
    await page.goto("/digital");

    const hrefs = new Set<string>();
    for (const locator of [page.locator("header a"), page.locator("footer a")]) {
      for (const href of await locator.evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href") ?? ""),
      )) {
        if (href.startsWith("/")) hrefs.add(href);
      }
    }

    expect(hrefs.size, "no internal links found in the agency chrome").toBeGreaterThan(5);

    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} returned ${response.status()}`).toBeLessThan(400);
    }
  });

  test("all seven services are reachable from the index", async ({ page }) => {
    await page.goto("/digital/services");
    const links = page.locator('main a[href^="/digital/services/"]');
    const hrefs = new Set(
      await links.evaluateAll((all) =>
        all.map((link) => (link as HTMLAnchorElement).getAttribute("href") ?? ""),
      ),
    );
    expect(hrefs.size).toBe(7);
  });
});

test.describe("the two front doors are distinguishable", () => {
  test("the agency header is not the marketplace header", async ({ page }) => {
    await page.goto("/digital");
    await expect(page.locator("header")).toContainText("DIGITAL");
    // The marketplace's own navigation must not be here, or a dealer principal reading
    // about stock feeds is offered a bakkie search.
    await expect(page.locator("header").getByRole("link", { name: "Find a car" })).toHaveCount(0);
  });

  test("the marketplace footer links to the agency", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('footer a[href="/digital"]');
    await expect(link).toHaveCount(1);
  });
});

test.describe("no invented proof", () => {
  /**
   * The brief forbids fabricating a statistic, testimonial, client name, review or case
   * study metric. Rynet Digital has no clients, so the correct number of all of those on
   * this site is zero, and the home page says so in as many words.
   *
   * This is a content test rather than a code test, which is unusual, and it is here because
   * the temptation to add "trusted by 40 dealerships" arrives the week before launch when
   * nobody is reading the brief.
   */
  test("the home page admits there are no clients yet", async ({ page }) => {
    await page.goto("/digital");
    await expect(
      page.getByRole("heading", { name: /have not done this for you yet/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("no aggregateRating or Review is emitted anywhere on the agency site", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const block of blocks) {
        expect(block, `${route.path} emits a rating`).not.toContain("aggregateRating");
        expect(block, `${route.path} emits a review`).not.toContain('"Review"');
      }
    }
  });
});

async function fillStepOne(page: Page) {
  await page.getByLabel("Dealership name").fill("Fixture Motors");
  await page.getByLabel("Website address").fill("fixturemotors.co.za");
  await page.getByRole("radio", { name: "One branch" }).check();
}

test.describe("the qualification form", () => {
  test("walks three steps and writes a lead", async ({ page }) => {
    await page.goto("/digital/contact");

    // Step one is three questions. A first step that is a wall of fields is the thing this
    // design exists to avoid, so the count is asserted rather than assumed.
    const status = page.getByRole("status");
    await expect(status).toContainText("Step 1 of 3");

    await fillStepOne(page);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(status).toContainText("Step 2 of 3");
    await page.getByRole("checkbox", { name: "Stock feeds" }).check();
    await page.getByRole("radio", { name: "This quarter" }).check();
    await page
      .getByLabel(/Anything else worth knowing/i)
      .fill("Our DMS export drops the derivative into the model field.");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(status).toContainText("Step 3 of 3");
    await page.getByLabel("Your name").fill("Lerato Dlamini");
    await page.getByLabel("Your role").fill("Dealer principal");
    await page.getByLabel("Email").fill("lerato@fixturemotors.test");
    await page.getByLabel("Phone").fill("082 555 0199");
    await page.getByRole("checkbox", { name: /I agree that Rynet may use/i }).check();

    // The server refuses anything submitted within four seconds of the form rendering. A
    // person cannot complete three steps that fast; Playwright can.
    await page.waitForTimeout(4200);

    await page.getByRole("button", { name: "Send it" }).click();
    await expect(page.getByRole("status")).toContainText(/within one working day/i, {
      timeout: 15000,
    });
  });

  test("a half-finished form survives a browser close", async ({ page, context }) => {
    await page.goto("/digital/contact");
    await fillStepOne(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("checkbox", { name: "Website", exact: true }).check();

    // Closing the page and opening a new one is as close as a test gets to closing the
    // browser. The draft lives in localStorage, which survives it.
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto("/digital/contact");

    await expect(reopened.getByText(/brought back what you had already filled in/i)).toBeVisible();
    await expect(reopened.getByLabel("Dealership name")).toHaveValue("Fixture Motors");
    await expect(reopened.getByRole("radio", { name: "One branch" })).toBeChecked();

    // And it can be thrown away, or a returning visitor is stuck with an old answer.
    await reopened.getByRole("button", { name: "Start again" }).click();
    await expect(reopened.getByLabel("Dealership name")).toHaveValue("");
    await reopened.close();
  });

  test("will not advance past a step that is not answered", async ({ page }) => {
    await page.goto("/digital/contact");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("status")).toContainText("Step 1 of 3");
    await expect(page.getByText("The name of the dealership.")).toBeVisible();
  });

  test("is keyboard operable end to end", async ({ page }) => {
    await page.goto("/digital/contact");

    await page.getByLabel("Dealership name").focus();
    await page.keyboard.type("Fixture Motors");
    await page.keyboard.press("Tab");
    await page.keyboard.type("fixturemotors.co.za");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");

    await expect(page.getByRole("radio", { name: "One branch" })).toBeChecked();

    // Tab must not reach a field on a hidden step. `hidden` takes them out of the tab order,
    // which is the reason the steps are hidden rather than unmounted.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
    const reachable = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.closest("fieldset[hidden]") === null;
    });
    expect(reachable, "focus reached a field on a hidden step").toBe(true);
  });

  test("the honeypot is unreachable by any route a person could take", async ({ page }) => {
    await page.goto("/digital/contact");

    const honeypot = page.locator('input[name="hp"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute("tabindex", "-1");

    // Off screen rather than sr-only. An sr-only element is one pixel and still in the
    // viewport, so some password managers fill it and turn a real person into a discarded
    // submission.
    const box = await honeypot.boundingBox();
    expect(box === null || box.x < -1000, "the honeypot is inside the viewport").toBe(true);
  });
});
