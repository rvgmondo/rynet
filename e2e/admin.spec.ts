import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

/**
 * The admin's own look: the sign-in screen, the menu and the home screen.
 *
 * Payload's forms and lists are Payload's markup and are not ours to audit line by line, so the
 * axe scans here are scoped to what Rynet draws: the sign-in heading and logo, the menu and the
 * home screen. They run in both themes, because the admin maps Payload's greys onto the SHOWROOM
 * tokens and a pair that passes in light can still fail in dark.
 *
 * Signs in through the API and hands the browser the session cookie, the same way the two-factor
 * suite does, so no test can lock the shared admin account with a failed attempt. One token is
 * shared by every test in a run, and the tests run one after another, because every sign-in to
 * that account rewrites its session list (see openSignedIn).
 */

// A dropped session is signed in again (see openSignedIn), which can take a few page loads.
test.describe.configure({ mode: "serial", timeout: 90_000 });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

let sharedToken: string | null = null;

async function signIn(
  context: BrowserContext,
  baseURL: string,
  theme: "light" | "dark",
  fresh = false,
) {
  if (fresh || !sharedToken) {
    const res = await context.request.post("/api/users/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!res.ok()) {
      throw new Error(
        `Could not sign in as ${ADMIN_EMAIL} (HTTP ${res.status()}). Run: npm run seed:admin && npm run seed`,
      );
    }
    sharedToken = ((await res.json()) as { token: string }).token;
  }
  const token = sharedToken;
  const { hostname } = new URL(baseURL);
  await context.addCookies([
    { name: "payload-token", value: token, domain: hostname, path: "/", httpOnly: true },
    { name: "payload-theme", value: theme, domain: hostname, path: "/" },
  ]);
}

/**
 * Signs in and opens a page, trying again if the session was dropped.
 *
 * Every run of every suite signs in as the same admin account, often at the same moment. Payload
 * keeps each account's sessions as a list on the user record, and two sign-ins that land together
 * can each write the list without the other's entry, so one of the two tokens stops working. That
 * is a property of the shared test account, not of this screen, so a dropped session is simply
 * signed in again rather than reported as a failure.
 */
async function openSignedIn(
  page: Page,
  context: BrowserContext,
  baseURL: string | undefined,
  theme: "light" | "dark",
  path: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      // Step out of whatever burst of sign-ins dropped the last one.
      await page.waitForTimeout(500 + Math.floor(Math.random() * 1500));
    }
    await signIn(context, baseURL ?? "http://localhost:3100", theme, attempt > 0);
    await page.goto(path);
    // The admin checks the session again once the page has loaded, and sends a dropped one to
    // the sign-in screen, so wait for the signed-in menu rather than trusting the first URL.
    const menu = page.locator("nav.rn-admin-nav");
    const signedOut = page.getByRole("heading", { level: 1, name: "Sign in to Rynet" });
    await expect(menu.or(signedOut).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    if ((await signedOut.count()) === 0) return;
  }
  throw new Error("The admin session was dropped five times in a row.");
}

async function expectNoViolations(page: Page, include: string[]) {
  let builder = new AxeBuilder({ page }).withTags(WCAG);
  for (const selector of include) builder = builder.include(selector);
  const results = await builder.analyze();
  if (results.violations.length > 0) {
    for (const v of results.violations) {
      console.error(`\n${v.id} (${v.impact}): ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
    }
  }
  expect(results.violations).toEqual([]);
}

async function openMenuOnSmallScreens(page: Page) {
  const toggler = page.locator("button.app-header__mobile-nav-toggler");
  if (!(await toggler.isVisible())) return;
  // The button does nothing until the page has hydrated.
  await expect(page.locator("aside.nav.nav--nav-hydrated")).toHaveCount(1);
  await expect(async () => {
    if (await page.locator("aside.nav[inert]").count()) await toggler.click();
    await expect(page.locator("aside.nav")).not.toHaveAttribute("inert", /.*/, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

test.describe("the sign-in screen", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`is Rynet's, with a heading, in ${theme}`, async ({ page, context, baseURL }) => {
      const { hostname } = new URL(baseURL ?? "http://localhost:3100");
      await context.addCookies([
        { name: "payload-theme", value: theme, domain: hostname, path: "/" },
      ]);
      await page.goto("/admin/login");

      await expect(page.getByRole("heading", { level: 1, name: "Sign in to Rynet" })).toBeVisible();
      await expect(page.locator(".login__brand").getByRole("img", { name: "Rynet" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page.locator(".graphic-logo, .graphic-icon")).toHaveCount(0);
      await expect(page).toHaveTitle(/\| Rynet admin$/);

      await expectNoViolations(page, [".login__brand", ".rn-admin-login-intro"]);
    });
  }
});

test.describe("the home screen", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`greets, counts and links, in ${theme}`, async ({ page, context, baseURL }) => {
      await openSignedIn(page, context, baseURL, theme, "/admin");

      const home = page.locator(".rn-admin-home");
      await expect(home.getByRole("heading", { level: 1 })).toHaveText(
        /^Good (morning|afternoon|evening)/,
      );
      for (const name of [
        "On the site today",
        "Quick actions",
        "Latest enquiries",
        "Recently changed cars",
        "Everything else",
      ]) {
        await expect(home.getByRole("heading", { level: 2, name })).toBeVisible();
      }

      // Every number is a real count, shown even when it is 0, and links to the list it counted.
      const live = home.getByRole("link", { name: /Cars? live on the site/ });
      await expect(live).toHaveAttribute(
        "href",
        /where%5Bor%5D%5B0%5D%5Band%5D%5B0%5D%5Bstatus%5D%5Bequals%5D=live/,
      );
      await expect(live.locator(".rn-admin-stat__value")).toHaveText(/^\d[\d\u00a0]*$/);

      await expect(home.getByRole("link", { name: /Add a car/ })).toHaveAttribute(
        "href",
        "/admin/collections/vehicles/create",
      );
      await expect(home.getByRole("link", { name: /See enquiries/ })).toBeVisible();
      await expect(home.getByRole("link", { name: /Review dealerships/ })).toBeVisible();
      await expect(home.getByRole("link", { name: /Upload photos/ })).toBeVisible();
      await expect(home.getByRole("link", { name: "Consent records" })).toBeVisible();

      await expect(page.locator(".graphic-logo, .graphic-icon")).toHaveCount(0);
      await expect(page).toHaveTitle(/^Home \| Rynet admin$/);

      await expectNoViolations(page, [".rn-admin-home"]);
    });
  }
});

test.describe("the menu", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`puts the day's work first, in ${theme}`, async ({ page, context, baseURL }) => {
      await openSignedIn(page, context, baseURL, theme, "/admin/collections/vehicles");
      await openMenuOnSmallScreens(page);

      const menu = page.getByRole("navigation", { name: "Admin menu" });
      const primary = menu.locator(".rn-admin-nav__list--primary a");
      await expect(primary).toHaveText(["Home", "Cars", "Dealerships", "Enquiries"]);
      await expect(menu.getByRole("link", { name: "Cars" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      // The lists are folded away but still one click from anywhere.
      const lists = menu.getByRole("button", { name: "Lists and records" });
      await expect(lists).toHaveAttribute("aria-expanded", /true|false/);

      await expectNoViolations(page, ["nav.rn-admin-nav"]);
    });
  }

  test("opens a folded group and remembers the choice", async ({
    page,
    context,
    baseURL,
    isMobile,
  }) => {
    // The choice is saved to the shared admin account, so only one project makes it, and the
    // saved record is put back exactly as it was found.
    test.skip(isMobile, "the desktop run covers the toggle");
    await openSignedIn(page, context, baseURL, "light", "/admin/collections/vehicles");

    // Signed by header: the request context does not send the browser's session cookie here.
    // Payload answers a missing preference with 200 and a null value.
    const auth = { headers: { Authorization: `JWT ${sharedToken}` } };
    const saved = await context.request.get("/api/payload-preferences/nav", auth);
    const before = saved.ok() ? ((await saved.json()) as { value?: unknown }).value : null;

    try {
      const menu = page.getByRole("navigation", { name: "Admin menu" });
      const lists = menu.getByRole("button", { name: "Lists and records" });
      const wasOpen = (await lists.getAttribute("aria-expanded")) === "true";
      const makes = menu.getByRole("link", { name: "Makes" });

      const written = page.waitForResponse(
        (r) => r.url().includes("/api/payload-preferences/nav") && r.request().method() === "POST",
      );
      await lists.click();
      await expect(lists).toHaveAttribute("aria-expanded", wasOpen ? "false" : "true");
      if (wasOpen) await expect(makes).toBeHidden();
      else await expect(makes).toBeVisible();
      await written;

      // Still the same after a full page load.
      await page.reload();
      await expect(menu.getByRole("button", { name: "Lists and records" })).toHaveAttribute(
        "aria-expanded",
        wasOpen ? "false" : "true",
      );
    } finally {
      if (before === null || before === undefined) {
        await context.request.delete("/api/payload-preferences/nav", auth);
      } else {
        await context.request.post("/api/payload-preferences/nav", {
          ...auth,
          data: { value: before },
        });
      }
    }
  });
});

test.describe("the everyday lists", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`show cars the way people read them, in ${theme}`, async ({ page, context, baseURL }) => {
      await openSignedIn(page, context, baseURL, theme, "/admin/collections/vehicles");

      const list = page.locator(".collection-list--vehicles");
      const firstRow = list.locator("tbody tr").first();
      // Named by year, make, model and variant, not the year alone.
      await expect(firstRow.locator("td.cell-title")).toHaveText(/^\d{4} \S+ \S+/);
      await expect(firstRow.locator("td.cell-price")).toHaveText(/^R\u00a0\d{1,3}(\u00a0\d{3})*/);
      await expect(firstRow.locator("td.cell-mileageKm")).toHaveText(/\d\skm$/);
      await expect(firstRow.locator("td.cell-status .rn-admin-badge")).not.toBeEmpty();

      // A quick filter sets the list's own filter and says it is on.
      const live = list.getByRole("button", { name: "Live", exact: true });
      await live.click();
      await expect(live).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(
        /where%5Bor%5D%5B0%5D%5Band%5D%5B0%5D%5Bstatus%5D%5Bequals%5D=live/,
      );
      await expect(list.getByRole("button", { name: "All cars" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      await expectNoViolations(page, [
        ".rn-admin-quick-filters",
        ".collection-list--vehicles td.cell-price",
        ".collection-list--vehicles td.cell-status",
        ".collection-list--vehicles td.cell-listPhoto",
      ]);
    });
  }

  test("list enquiries without an Add new button", async ({ page, context, baseURL }) => {
    await openSignedIn(page, context, baseURL, "light", "/admin/collections/leads");
    const list = page.locator(".collection-list--leads");
    await expect(list.getByRole("heading", { level: 1, name: "Enquiries" })).toBeVisible();
    await expect(list.getByRole("link", { name: /Create new Enquiry/ })).toBeHidden();
    await expect(list.getByRole("button", { name: "Needs a reply" })).toBeVisible();
  });
});

test.describe("a car's edit screen", () => {
  test("says whether the car is on the site, in plain words", async ({
    page,
    context,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? "http://localhost:3100", "light");
    const auth = { headers: { Authorization: `JWT ${sharedToken}` } };
    const found = await context.request.get(
      "/api/vehicles?where[status][equals]=live&limit=1&depth=0&sort=id",
      auth,
    );
    const car = ((await found.json()) as { docs: { id: number }[] }).docs[0];
    test.skip(!car, "no live car to open");

    await openSignedIn(page, context, baseURL, "light", `/admin/collections/vehicles/${car?.id}`);

    const state = page.locator(".rn-admin-listing-state");
    await expect(state).toContainText("On the site:");
    await expect(state.locator(".rn-admin-badge").first()).toHaveText(/Live on the site/);
    // Payload's own words for its save state are not shown.
    await expect(page.locator(".doc-controls")).not.toContainText("Status: Draft");
    await expect(page.getByRole("link", { name: /History/ })).toBeVisible();
    await expect(page.locator(".rn-admin-side-note")).toContainText("On the site");

    await expectNoViolations(page, [".rn-admin-listing-state", ".rn-admin-side-note"]);
  });
});

test.describe("a car taken off the site", () => {
  test("is gone from its own address, not only from search", async ({
    context,
    request,
    baseURL,
  }) => {
    await signIn(context, baseURL ?? "http://localhost:3100", "light");
    const auth = { headers: { Authorization: `JWT ${sharedToken}` } };
    const found = await request.get(
      "/api/vehicles?where[status][equals]=live&limit=1&depth=0&sort=id",
      auth,
    );
    const template = ((await found.json()) as { docs: Record<string, unknown>[] }).docs[0];
    test.skip(!template, "no live car to copy");

    // A copy of a live car, saved as a draft. Row ids are dropped so the rows are new rows.
    const withoutRowIds = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map((row) =>
            row && typeof row === "object" && "id" in row
              ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id"))
              : row,
          )
        : value;
    const data = Object.fromEntries(
      Object.entries(template ?? {})
        .filter(([key]) => !["id", "createdAt", "updatedAt", "publicRef", "_status"].includes(key))
        .map(([key, value]) => [key, withoutRowIds(value)]),
    );
    const created = await request.post("/api/vehicles", {
      ...auth,
      data: { ...data, stockNumber: `HIDDEN-${Date.now()}`, status: "draft" },
    });
    expect(created.status(), await created.text()).toBe(201);
    const id = ((await created.json()) as { doc: { id: number } }).doc.id;

    try {
      const car = (await (await request.get(`/api/vehicles/${id}?depth=1`, auth)).json()) as {
        modelYear: number;
        publicRef: string;
        make: { slug: string };
        model: { slug: string };
        variant?: { name?: string } | null;
      };
      const variant = car.variant?.name
        ? `-${car.variant.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}`
        : "";
      const address = `/vehicles/${car.make.slug}/${car.model.slug}/${car.modelYear}${variant}-${car.publicRef.toLowerCase()}`;
      const page = await request.get(address, { maxRedirects: 0 });
      expect(page.status(), `${address} should not show a draft car`).toBe(404);
    } finally {
      await request.delete(`/api/vehicles/${id}`, auth);
    }
  });
});
