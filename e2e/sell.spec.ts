import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

/**
 * Sell to a dealer.
 *
 * The page carries three risks the marketplace pages do not, and there is a test for each.
 *
 * **It could be read as a private listing.** The platform's entire promise is that only
 * verified dealerships list. A page inviting private individuals to "sell your car" is one
 * careless sentence away from undoing that, so the copy is asserted, not just the routes.
 *
 * **It could imply a valuation.** Rynet holds no valuation licence. A number on this page
 * would be invented and somebody would make a financial decision on it.
 *
 * **The consent is multi-recipient.** These details go to several dealerships, not one, and
 * POPIA consent has to say so. The test below submits the form and then compares the consent
 * record stored as evidence against the words that were actually on screen. Evidence that
 * does not match the screen is worse than no evidence.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

const PATH = "/sell-to-a-dealer";
const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

test.describe("accessibility and layout", () => {
  test("has no axe violations", async ({ page }) => {
    await page.goto(PATH);
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

  test("never scrolls sideways", async ({ page }) => {
    await page.goto(PATH);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("the hard rule survives this page", () => {
  test("it says outright that a private individual cannot list", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { name: /We do not list your car on Rynet/i }),
    ).toBeVisible();
    await expect(page.getByText(/Only registered dealerships list here/i)).toBeVisible();
  });

  test("it promises no valuation, anywhere", async ({ page }) => {
    await page.goto(PATH);

    // No rand figure may appear on this page at all. A "from R 120 000" or an estimate range
    // would be a number nobody measured, on the one page where that number is the decision.
    const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    expect(body, "a rand figure appeared on a page that must not value cars").not.toMatch(/R\s?\d/);
    await expect(page.getByRole("heading", { name: /We do not value your car/i })).toBeVisible();
  });

  /**
   * Added after a POPIA and copy audit found the page promising something the platform cannot
   * currently do. Rynet has not signed a single dealership, so "they come back to you with
   * offers" was a promise with nobody behind it. The agency site had the same problem and
   * solves it the same way: say so in the first thing the reader sees.
   */
  test("it admits there may be no dealership yet", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByText(/We are new, so read this first/i)).toBeVisible();
    await expect(page.getByText(/may not yet be one in your province/i)).toBeVisible();
  });

  test("the section 18 notice is on the page, not only behind a link", async ({ page }) => {
    await page.goto(PATH);
    const notice = page.getByRole("region", { name: /What happens to your details/i });
    await expect(notice).toBeVisible();

    // The two items most often left out, and the two a data subject actually needs.
    await expect(notice).toContainText(/Pretoria/i);
    await expect(notice).toContainText(/enquiries@inforegulator.org.za/i);
    await expect(notice).toContainText(/voluntary/i);
  });

  test("no forbidden private-listing route reaches the navigation", async ({ page }) => {
    await page.goto(PATH);
    const hrefs = await page
      .locator("a")
      .evaluateAll((links) =>
        links.map((l) => (l as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
    expect(hrefs.filter((h) => /sell-your-car|list-my-car|place-an-ad|private/i.test(h))).toEqual(
      [],
    );
  });
});

async function login(request: APIRequestContext) {
  const res = await request.post("/api/users/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`Could not sign in as ${ADMIN_EMAIL} (HTTP ${res.status()}).`);
  return (await res.json()).token as string;
}

async function fillStepOne(page: Page, model: string) {
  await page.getByLabel("Make").fill("Toyota");
  await page.getByLabel("Model").fill(model);
  await page.getByLabel("Year").fill("2019");
  await page.getByLabel("Mileage").fill("128000");
}

test.describe("the form", () => {
  test("walks three steps and writes a trade-in lead nobody owns", async ({ page, request }) => {
    const model = `Hilux ISO ${Date.now()}`;

    await page.goto(PATH);
    const status = page.getByRole("status");
    await expect(status).toContainText("Step 1 of 3");

    await fillStepOne(page, model);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(status).toContainText("Step 2 of 3");
    await page.getByRole("radio", { name: "Manual" }).check();
    await page.getByRole("radio", { name: /Good, a few marks/i }).check();
    await page.getByRole("radio", { name: /Full, with the book/i }).check();
    await page.getByRole("radio", { name: /Still on finance/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(status).toContainText("Step 3 of 3");
    // exact, because the consent sentence also contains the word "province".
    await page.getByLabel("Province", { exact: true }).selectOption({ index: 1 });
    await page.getByLabel("Town or city").fill("Centurion");
    await page.getByLabel("Your name").fill("Nomsa Khumalo");
    // exact again: the consent sentence mentions emailing privacy@rynet.co.za.
    await page.getByLabel("Email", { exact: true }).fill("nomsa@example.co.za");
    await page.getByLabel("Phone", { exact: true }).fill("082 555 0177");

    // Capture the consent text exactly as rendered, before ticking it. The stored evidence is
    // compared against this string below.
    const onScreen = (
      await page.locator("label", { has: page.locator('input[name="consent"]') }).innerText()
    )
      .replace(/\s+/g, " ")
      .trim();

    await page.getByRole("checkbox", { name: /I agree that Rynet may pass/i }).check();

    // The server refuses anything submitted within four seconds of the form rendering.
    await page.waitForTimeout(4200);
    await page.getByRole("button", { name: "Send it to dealerships" }).click();
    await expect(page.getByRole("status")).toContainText(/We will pass it to dealerships/i, {
      timeout: 15000,
    });

    // What actually reached the database. The screen saying "sent" has been wrong before.
    const token = await login(request);
    const auth = { headers: { Authorization: `JWT ${token}` } };

    const leads = await (
      await request.get(
        "/api/leads?where[type][equals]=trade_in&limit=50&depth=0&sort=-createdAt",
        auth,
      )
    ).json();
    const lead = leads.docs.find(
      (d: { tradeIn?: { model?: string } }) => d.tradeIn?.model === model,
    );

    expect(lead, "no trade-in lead was written").toBeTruthy();
    expect(lead.name).toBe("Nomsa Khumalo");
    expect(lead.dealer, "a trade-in lead must belong to Rynet, not one dealership").toBeFalsy();
    expect(lead.tradeIn.make).toBe("Toyota");
    expect(lead.tradeIn.modelYear).toBe(2019);
    expect(lead.tradeIn.mileageKm).toBe(128000);
    expect(lead.tradeIn.transmission).toBe("manual");
    expect(lead.tradeIn.condition).toBe("good");
    expect(lead.tradeIn.serviceHistory).toBe("full");
    expect(lead.tradeIn.finance).toBe("outstanding");
    expect(lead.tradeIn.city).toBe("Centurion");
    expect(lead.tradeIn.province, "the province must resolve to a real record").toBeTruthy();
    expect(
      lead.consent,
      "a trade-in lead without a consent record is unlawful to act on",
    ).toBeTruthy();

    // And the consent evidence must be the words that were on screen, not a paraphrase.
    const consent = await (
      await request.get(`/api/consent-records/${lead.consent}?depth=0`, auth)
    ).json();
    expect(consent.purpose).toBe("trade_in");
    expect(
      consent.evidence.replace(/\s+/g, " ").trim(),
      "the stored consent does not match what the person actually read",
    ).toBe(onScreen);
  });

  test("a half-finished form survives a browser close", async ({ page, context }) => {
    await page.goto(PATH);
    await fillStepOne(page, "Fortuner");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "Automatic" }).check();

    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(PATH);

    await expect(reopened.getByText(/brought back what you had already filled in/i)).toBeVisible();
    await expect(reopened.getByLabel("Model")).toHaveValue("Fortuner");
    await expect(reopened.getByLabel("Mileage")).toHaveValue("128000");

    await reopened.getByRole("button", { name: "Start again" }).click();
    await expect(reopened.getByLabel("Model")).toHaveValue("");
    await reopened.close();
  });

  test("will not advance past a step that is not answered", async ({ page }) => {
    await page.goto(PATH);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("status")).toContainText("Step 1 of 3");
    await expect(page.getByText("Which make?")).toBeVisible();
  });

  test("refuses a mileage that is not a real mileage", async ({ page }) => {
    await page.goto(PATH);
    await fillStepOne(page, "Corolla");
    await page.getByLabel("Mileage").fill("9000000");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("status")).toContainText("Step 1 of 3");
    await expect(page.getByText(/does not look right/i)).toBeVisible();
  });

  test("the honeypot is unreachable by any route a person could take", async ({ page }) => {
    await page.goto(PATH);
    const honeypot = page.locator('input[name="hp"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute("tabindex", "-1");

    const box = await honeypot.boundingBox();
    expect(box === null || box.x < -1000, "the honeypot is inside the viewport").toBe(true);
  });

  test("keyboard focus never lands on a hidden step", async ({ page }) => {
    await page.goto(PATH);
    await page.getByLabel("Make").focus();
    for (let i = 0; i < 8; i += 1) await page.keyboard.press("Tab");

    const reachable = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return active?.closest("fieldset[hidden]") === null;
    });
    expect(reachable, "focus reached a field on a hidden step").toBe(true);
  });
});
