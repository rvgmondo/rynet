import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { renderEverything } from "./axe-context";

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

/*
 * Sixty seconds rather than thirty for this file. Most of these tests open a listing through two
 * or three pages first, and a real listing carries a dozen photographs where a demonstration one
 * carried one. Alone each test takes a few seconds; with every worker on one server at once, the
 * walk to the page could use up most of thirty seconds before the test had asserted anything.
 */
test.describe.configure({ timeout: 60_000 });

/**
 * Opens a listing from the results: the first one, or the first of one kind.
 *
 * `waitForURL` is load-bearing. Clicking a card is a CLIENT-SIDE navigation, so no new
 * document loads and `waitForLoadState` returns immediately. Without this the helper
 * returned while still on /cars, and every test after it silently ran against the search
 * page. They failed for reasons that had nothing to do with what they were testing, which
 * cost more time than the fix.
 *
 * Asserting on the h1 does not catch it either: /cars has one too.
 *
 * WHY THE KIND. The results used to be demonstration stock and nothing else, so "the first
 * listing" was always a demonstration one, and the tests that guard what a demonstration page
 * may say simply opened it. Real stock sorts first now (Amico Motors' cars are the newest), so
 * those tests skipped themselves and guarded nothing. They ask for a demonstration listing by
 * name instead, and the tests that matter for real stock ask for a real one. A demonstration card
 * carries a Demo listing badge and a real one never does, which is how the two are told apart.
 *
 * A demonstration listing is reached through a demonstration dealership's own page rather than by
 * paging through the results. Real stock fills the first pages, and walking four results pages
 * per test with eight workers on one server took long enough to time out.
 */
type ListingKind = "first" | "demonstration" | "real";

async function openListing(
  page: import("@playwright/test").Page,
  kind: ListingKind = "first",
): Promise<boolean> {
  if (kind === "demonstration") {
    await page.goto("/dealers");
    const dealer = page
      .locator("article")
      .filter({ hasText: /Demo dealership/ })
      .first();
    if ((await dealer.count()) === 0) return false;
    const href = await dealer.locator('a[href^="/dealers/"]').first().getAttribute("href");
    if (!href) return false;
    await page.goto(href);
    const car = page.locator('article h3 a[href^="/vehicles/"]').first();
    if ((await car.count()) === 0) return false;
    await car.click();
    await page.waitForURL(/\/vehicles\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    return true;
  }

  const MOST_PAGES = 15;
  for (let number = 1; number <= MOST_PAGES; number += 1) {
    await page.goto(number === 1 ? LISTING : `${LISTING}?page=${number}`);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const matching = kind === "first" ? cards : cards.filter({ hasNotText: /Demo listing/ });
    if ((await matching.count()) > 0) {
      await matching.first().locator("h3 a").click();
      await page.waitForURL(/\/vehicles\//);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      return true;
    }
    if ((await page.locator('a[rel="next"]').count()) === 0) break;
  }
  return false;
}

async function openFirstListing(page: import("@playwright/test").Page) {
  await openListing(page, "first");
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
    await expect(
      page.locator("#finance").getByText("Total cost of credit", { exact: true }),
    ).toBeVisible();
  });

  test("never calls a demonstration dealership verified", async ({ page }) => {
    // Hard rule 1: seeded dealerships do not exist, so a listing from one says "Demo dealership"
    // and nothing on the page states "Verified dealership" as a fact about it.
    const found = await openListing(page, "demonstration");
    test.skip(!found, "there is no demonstration stock on the site");
    await expect(page.getByText(/Demonstration listing/i).first()).toBeVisible();

    await expect(page.getByText("Demo dealership").first()).toBeVisible();

    /*
     * Nothing about THIS listing says "Verified dealership". The cards further down the page
     * (similar cars, more from this dealership) are other listings, each saying the truth about
     * its own dealership, and a real one is verified: Amico Motors' cars appear there now. So the
     * claim is looked for everywhere except inside another listing's card.
     */
    const claims = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let found = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!/Verified dealership/i.test(node.textContent ?? "")) continue;
        // The framework's own data (the serialised page in its script tags) is not the page.
        if (node.parentElement?.closest("script, style, template, noscript")) continue;
        if (node.parentElement?.closest("article")) continue;
        found += 1;
      }
      return found;
    });
    expect(claims, "a demonstration listing called its dealership verified").toBe(0);

    // The enquiry dialog says it in words as well, because it is often opened from the phone bar
    // long after the page's notice has scrolled away.
    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText("The car is not for sale.");
  });

  test("offers no phone number or WhatsApp for a dealership that does not exist", async ({
    page,
  }) => {
    /*
     * Hard rules 1 and 2. A demonstration dealership's number rings no business (and the range it
     * was seeded in is not proven unassignable), so neither the listing nor the dealership's own
     * page may offer it: no Show number, no Call in the phone bar, no WhatsApp link. Asserted on
     * the served markup, hidden bars included, not only on what happens to be on screen.
     */
    const found = await openListing(page, "demonstration");
    test.skip(!found, "there is no demonstration stock on the site");
    await expect(page.getByText(/Demonstration listing/i).first()).toBeVisible();

    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Show number/i })).toHaveCount(0);

    const dealerHref = await page.locator('a[href^="/dealers/"]').first().getAttribute("href");
    expect(dealerHref, "the listing does not link its dealership").toBeTruthy();
    await page.goto(dealerHref as string);
    await expect(page.getByText("Demo dealership").first()).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('a[href*="google.com/maps"]')).toHaveCount(0);
    // Its week is an example: labelled so, and never measured against today's date.
    await expect(page.getByText("Example hours").first()).toBeVisible();
    await expect(page.getByText(/Trading hours|Open now|Closed now/)).toHaveCount(0);
  });

  test("says who is verified on the verification page, and no more", async ({ page }) => {
    /*
     * While every dealership is a demonstration, the specimen must not wear the green stamp the
     * page's own notice says nobody has earned. Once a real dealership is verified, the page says
     * how many there are and stops saying that every dealership is a demonstration. Both halves
     * are asserted, whichever the data is, so neither can go quietly untested.
     */
    await page.goto("/how-verification-works");
    const allDemonstration = await page
      .getByText(/Every dealership on Rynet today is a demonstration/)
      .isVisible()
      .catch(() => false);
    const count = page.getByText(/\d+ verified dealerships? on Rynet/);
    if (allDemonstration) {
      await expect(page.locator(".rn-badge--verified")).toHaveCount(0);
      await expect(page.getByText("Example of the verified badge")).toBeVisible();
      await expect(count).toHaveCount(0);
    } else {
      await expect(count).toBeVisible();
      await expect(
        page.getByText(/Every dealership on Rynet today is a demonstration/),
      ).toHaveCount(0);
    }
  });

  for (const kind of ["demonstration", "real"] as const) {
    test(`never publishes the VIN on a ${kind} listing`, async ({ page }) => {
      const found = await openListing(page, kind);
      test.skip(!found, `there is no ${kind} stock on the site`);
      const html = await page.content();
      expect(html).not.toMatch(/vehicleIdentificationNumber/i);
    });
  }

  for (const kind of ["demonstration", "real"] as const) {
    test(`publishes structured data only for a real car (${kind} listing)`, async ({ page }) => {
      /*
       * The inverse of the test this replaces, and the replacement is the point.
       *
       * This used to assert that a vehicle page emits a Car with an Offer, a ZAR price and an
       * AutoDealer seller. It did, for all 311 seeded listings, every one of which describes a
       * car that does not exist sold by a business that does not exist, on a page that says so
       * in its own copy. A structured data block is a machine-readable assertion that
       * something is real, so that was a fabricated listing published to the one reader who
       * cannot see the disclaimer.
       *
       * A hard navigation on purpose. Clicking through from the results is a soft navigation
       * and React does not re-insert a script tag on one. What matters for structured data is
       * the SERVER response, which is what a crawler asks for, so the test asks the same way.
       *
       * Run once on each kind of listing, so both halves of the rule are exercised every time.
       */
      const found = await openListing(page, kind);
      test.skip(!found, `there is no ${kind} stock on the site`);
      // The structured data is in the server's HTML, so the document is enough; waiting for every
      // photograph on a real listing to load as well ran past the timeout under a full run.
      await page.reload({ waitUntil: "domcontentloaded" });

      const blocks = await page.evaluate(() =>
        [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (s) => s.textContent ?? "",
        ),
      );
      const parsed = blocks.map((b) => JSON.parse(b));

      const demonstration = await page
        .getByText(/Demonstration listing/i)
        .first()
        .isVisible()
        .catch(() => false);

      const car = parsed.find((b) => b["@type"] === "Car");

      expect(demonstration, `the ${kind} listing was not what its results card said`).toBe(
        kind === "demonstration",
      );
      if (demonstration) {
        expect(car, "a demonstration listing published a Car offer to search engines").toBeFalsy();
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      } else {
        expect(car).toBeTruthy();
        expect(car.offers.priceCurrency).toBe("ZAR");
        expect(car.offers.seller["@type"]).toBe("AutoDealer");
        expect(car.mileageFromOdometer.unitCode).toBe("KMT");
        // A rating that has not been collected must never be marked up.
        expect(car.offers.seller.aggregateRating).toBeUndefined();
      }

      // Whatever the listing is, navigation markup is always honest and always present.
      expect(parsed.find((b) => b["@type"] === "BreadcrumbList")).toBeTruthy();
    });
  }

  // A real listing and a demonstration one render different things (a phone number, trading hours
  // and a map for the first, notices for the second), so each is checked.
  for (const kind of ["demonstration", "real"] as const) {
    test(`has no axe violations on a ${kind} listing`, async ({ page }) => {
      const found = await openListing(page, kind);
      test.skip(!found, `there is no ${kind} stock on the site`);
      await renderEverything(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      if (results.violations.length > 0) {
        for (const v of results.violations) console.error(`${v.id}: ${v.help}`);
      }
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("enquiring", () => {
  /*
   * These open a demonstration listing when there is one. Sending a test enquiry to a real
   * dealership's car puts a made-up buyer in that dealership's leads, and once email is switched
   * on it would reach their inbox.
   */
  const openForEnquiry = async (page: import("@playwright/test").Page) => {
    if (!(await openListing(page, "demonstration"))) await openFirstListing(page);
  };

  test("sends, and the dialog is keyboard operable throughout", async ({ page }) => {
    await openForEnquiry(page);

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
      timeout: 30000,
    });
  });

  test("refuses to send without consent", async ({ page }) => {
    await openForEnquiry(page);
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
    await openForEnquiry(page);
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
    await openForEnquiry(page);
    await page
      .getByRole("button", { name: /Enquire about this vehicle/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await renderEverything(page);

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

  /*
   * Both of these fetch rather than navigate, and fetch in parallel.
   *
   * They used to drive a full browser navigation per link, which renders and hydrates a whole
   * page to read one status code. As the navigation grew that became about twenty renders in
   * series, and with eight workers contending for one Node process and one SQLite file it
   * crossed the thirty second timeout and failed as though a link were dead. It was not: every
   * page answers in under 200ms when the server is not being hammered.
   *
   * A link checker's contract is the status code, so that is what it checks. Whether the pages
   * render correctly is the axe and responsive suites' job, on the templates that matter.
   */
  test("every one of them exists", async ({ request }) => {
    const results = await Promise.all(
      ROUTES.map(async (route) => ({ route, status: (await request.get(route)).status() })),
    );

    for (const { route, status } of results) {
      expect(status, `${route} should not be a 404`).toBe(200);
    }
  });

  test("nothing in the header or footer leads to a 404", async ({ page, request }) => {
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

    const results = await Promise.all(
      unique.map(async (href) => ({ href, status: (await request.get(href)).status() })),
    );

    for (const { href, status } of results) {
      expect(status, `${href} is linked from the chrome and 404s`).toBe(200);
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

  test("the sitemap offers nothing that is blocked, and nothing that is not real", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();

    // The pages that are always real and always worth crawling.
    expect(body).toMatch(/<loc>[^<]*\/cars<\/loc>/);
    expect(body).toMatch(/<loc>[^<]*\/how-verification-works/);

    // Submitting a URL that robots.txt blocks is a contradiction Google reports as an error.
    expect(body).not.toMatch(/<loc>[^<]*\?/);
    expect(body).not.toMatch(/<loc>[^<]*\/admin/);

    /*
     * Every listing and dealership in the sitemap must be one that exists.
     *
     * A sitemap is a request to index, and the seed carries 311 listings and 12 dealerships
     * that are not real. Each vehicle URL here is fetched and checked for the noindex the
     * demonstration pages carry: offering a page for indexing while telling the crawler not
     * to index it is the contradiction this guards against.
     */
    const listed = [...body.matchAll(/<loc>([^<]*\/(?:vehicles|dealers)\/[^<]*)<\/loc>/g)].map(
      (m) => m[1] as string,
    );

    // Fetched three at a time. One at a time, twelve real listing pages rendered behind seven
    // other workers ran past the timeout; all twelve at once had the server drop connections.
    const pages: { url: string; html: string }[] = [];
    const queue = listed.slice(0, 12);
    while (queue.length > 0) {
      const batch = queue.splice(0, 3);
      pages.push(
        ...(await Promise.all(
          batch.map(async (url) => ({
            url,
            html: await (await request.get(new URL(url).pathname)).text(),
          })),
        )),
      );
    }
    for (const { url, html } of pages) {
      expect(html, `${url} is in the sitemap and marked noindex`).not.toMatch(
        /<meta name="robots" content="noindex/,
      );
    }
  });
});
