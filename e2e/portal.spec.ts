import { type Browser, expect, type Page, test } from "@playwright/test";

import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";
import {
  adminCaller,
  auth,
  dealerAId,
  expectNoAxeViolations,
  expectNoOverflow,
  makeCar,
  PORTAL_PASSWORD,
  tokenFor,
} from "./portal-helpers";

/**
 * The dealer portal, /portal: a dealership's own login, end to end.
 *
 * Staff give dealer A a login the way the onboarding desk does, the new person chooses a password
 * from the link, and then works the portal: sees their own enquiries and never dealer B's, moves a
 * car to reserved and back, and signs out. Every page is held to the same axe bar as the site.
 *
 * Each run makes its own login rather than signing in as the fixture owner, because the isolation
 * suite signs that account in at the same time and two sign-ins landing together can leave one
 * session refused. The login is deleted afterwards.
 *
 * Needs the fixture accounts: `npm run seed && npm run seed:fixtures`.
 */

const NEW_PASSWORD = PORTAL_PASSWORD;

test.describe("the way in", () => {
  test("a stranger is sent to sign in", async ({ page }) => {
    await page.goto("/portal/cars");
    await expect(page).toHaveURL(/\/portal\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoOverflow(page);
  });

  test("a wrong password says so and lets nobody in", async ({ page }) => {
    await page.goto("/portal/sign-in");
    // An address with no account, so the test never counts towards locking a real one.
    await page.getByLabel("Email").fill("nobody-at-all@rynet.test");
    await page.getByLabel("Password").fill("not the password at all");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator(".rn-portal-problem[role=alert]")).toContainText(/incorrect/i);
    await expect(page).toHaveURL(/\/portal\/sign-in$/);
  });

  test("a made-up link to choose a password is turned away", async ({ page }) => {
    await page.goto(`/portal/set-password?token=${"0".repeat(40)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "This link has ended" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the portal is not for search engines", async ({ request }) => {
    const res = await request.get("/portal/sign-in");
    expect(await res.text()).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });
});

test.describe("giving a login is for staff only", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  test("a stranger and a dealership's own owner are refused", async ({ request }) => {
    const data = { dealerId: 1, name: "X", email: "x@rynet.test" };
    expect((await request.post("/api/onboard/login", { data })).status()).toBe(403);
    const owner = await tokenFor(request, FIXTURES.ownerA, FIXTURE_PASSWORD);
    const res = await request.post("/api/onboard/login", { headers: auth(owner), data });
    expect(res.status()).toBe(403);
  });
});

test.describe
  .serial("a dealership's own login, end to end", () => {
    let page: Page;
    let email: string;
    let link: string;
    let carId: number | null = null;
    let call: ReturnType<typeof adminCaller>;

    test.beforeAll(async ({ browser, playwright, baseURL }, info) => {
      const request = await playwright.request.newContext({ baseURL });
      call = adminCaller(request);

      const dealerId = await dealerAId(request);
      // A live car of dealer A's own, deleted afterwards. The fixtures give dealer A no stock.
      carId = await makeCar(request, call, dealerId);

      email = `portal-${info.project.name}-${Date.now()}@rynet.test`.toLowerCase();
      const res = await call((headers) =>
        request.post("/api/onboard/login", {
          headers,
          data: { dealerId, name: "Thandi Mokoena", email, phone: "082 000 0000" },
        }),
      );
      expect(res.ok(), await res.text()).toBe(true);
      const body = (await res.json()) as { path: string; fresh: boolean };
      expect(body.fresh).toBe(true);
      expect(body.path).toMatch(/^\/portal\/set-password\?token=[a-f0-9]{40}$/);
      link = body.path;

      // Asking again for the same person gives a fresh link and retires the first.
      const again = await call((headers) =>
        request.post("/api/onboard/login", {
          headers,
          data: { dealerId, name: "Thandi Mokoena", email },
        }),
      );
      const second = (await again.json()) as { path: string; fresh: boolean };
      expect(second.fresh).toBe(false);
      expect(second.path).not.toBe(link);
      const retired = link;
      link = second.path;

      page = await (await (browser as Browser).newContext()).newPage();
      await page.goto(retired);
      await expect(
        page.getByRole("heading", { level: 1, name: "This link has ended" }),
      ).toBeVisible();
    });

    test.afterAll(async ({ playwright, baseURL }) => {
      await page?.context().close();
      const request = await playwright.request.newContext({ baseURL });
      const caller = adminCaller(request);
      const found = await caller((headers) =>
        request.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`, {
          headers,
        }),
      );
      const id = ((await found.json()) as { docs: { id: number }[] }).docs[0]?.id;
      if (id) await caller((headers) => request.delete(`/api/users/${id}`, { headers }));
      if (carId) await caller((headers) => request.delete(`/api/vehicles/${carId}`, { headers }));
    });

    test("they choose a password and land in their portal", async () => {
      await page.goto(link);
      await expect(
        page.getByRole("heading", { level: 1, name: "Choose your password" }),
      ).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
      await expectNoAxeViolations(page);

      await page.getByLabel("New password").fill("short");
      await page.getByLabel("The same again").fill("short");
      await page.getByRole("button", { name: "Save and sign in" }).click();
      await expect(page.locator(".rn-portal-problem[role=alert]")).toContainText("at least 10");

      await page.getByLabel("New password").fill(NEW_PASSWORD);
      await page.getByLabel("The same again").fill(NEW_PASSWORD);
      await page.getByRole("button", { name: "Save and sign in" }).click();
      await expect(page).toHaveURL(/\/portal$/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        /Good (morning|afternoon|evening), Thandi./,
      );
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);
    });

    test("the link works once", async ({ browser }) => {
      const stranger = await (await browser.newContext()).newPage();
      await stranger.goto(link);
      await expect(
        stranger.getByRole("heading", { level: 1, name: "This link has ended" }),
      ).toBeVisible();
      await stranger.context().close();
    });

    test("they see their own enquiries and never another dealership's", async () => {
      await page.goto("/portal/enquiries");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Buyers asking about your cars",
      );
      await expect(page.getByText(FIXTURES.leadNameA).first()).toBeVisible();
      await expect(page.getByText(FIXTURES.leadNameB)).toHaveCount(0);
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);
    });

    test("they reserve a car and put it back on sale", async () => {
      await page.goto("/portal/cars");
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);

      // Found by its id: a car's title is made from its make, model and year, so it is not unique.
      const button = (label: string) =>
        page.locator(`form:has(input[name="id"][value="${carId}"])`).getByRole("button", {
          name: new RegExp(`^${label}`),
        });

      await button("Reserved").click();
      // The page redraws without it once the save has landed; leaving earlier cancels the save.
      await expect(button("Reserved")).toHaveCount(0);
      await page.goto("/portal/cars?show=reserved");
      await expect(button("Back on sale")).toBeVisible();
      await button("Back on sale").click();
      await expect(button("Back on sale")).toHaveCount(0);
      await page.goto("/portal/cars");
      await expect(button("Reserved")).toBeVisible();
    });

    test("ads and their details pass the same checks", async () => {
      await page.goto("/portal/ads");
      await expect(page.getByRole("heading", { level: 1, name: "Ready to post" })).toBeVisible();
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);

      await page.goto("/portal/details");
      await expect(
        page.getByRole("heading", { level: 1, name: "How buyers reach you" }),
      ).toBeVisible();
      await expect(page.getByLabel("WhatsApp number")).toBeVisible();
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);
    });

    test("signing out ends it", async () => {
      await page.goto("/portal");
      await page
        .getByRole("button", { name: "Sign out" })
        .filter({ visible: true })
        .first()
        .click();
      await expect(page).toHaveURL(/\/portal\/sign-in\?reason=signed-out$/);
      await page.goto("/portal");
      await expect(page).toHaveURL(/\/portal\/sign-in$/);
    });

    test("and they can sign in again with the password they chose", async () => {
      await page.goto("/portal/sign-in");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(NEW_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/portal$/);
    });
  });
