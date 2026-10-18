import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";
import {
  type AdminCall,
  adminCaller,
  auth,
  dealerAId,
  deleteUserByEmail,
  expectNoAxeViolations,
  expectNoOverflow,
  makeCar,
  makePhoto,
  signedInDealer,
  tokenFor,
} from "./portal-helpers";

/**
 * Posting to a dealership's own Facebook and Instagram, from the portal.
 *
 * There is no Facebook in a test run, so the parts that talk to Meta are covered in
 * src/lib/social/social.test.ts and this suite covers everything around them: who may connect and
 * post, that a forged or stale connect is refused, that a post from the Ad studio reaches the
 * queue and its outcome shows in the portal, that a new car is queued for an account with
 * automatic posting on, and that no API ever hands out a Page token.
 *
 * The connected Page here is made by the admin with no token, which is exactly a Page Facebook
 * has stopped accepting: the publisher must say so on the post rather than fail quietly.
 *
 * Desktop only. Both projects would share dealer A's one connection.
 */

test.skip(({ isMobile }) => isMobile, "one connection per dealership, so desktop only");

test.describe("who may connect and post", () => {
  test("a stranger, and Rynet staff, cannot post as a dealership", async ({ request }) => {
    const post = (headers?: Record<string, string>) =>
      request.post("/api/portal/social/post", { headers, multipart: { caption: "x" } });
    expect((await post()).status()).toBe(401);
    const call = adminCaller(request);
    expect((await call((headers) => post(headers))).status()).toBe(401);
  });

  test("a connect link with a forged state is turned away", async ({ request }) => {
    const res = await request.get("/api/portal/social/callback?code=x&state=not.signed", {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toMatch(/\/portal\/social\?problem=expired$/);
  });

  test("an unknown picture is not served", async ({ request }) => {
    expect((await request.get("/social-media/nothing.jpg")).status()).toBe(404);
    expect((await request.get(`/social-media/${"0".repeat(32)}.jpg`)).status()).toBe(404);
  });
});

test.describe
  .serial("a dealership's own Page", () => {
    let request: APIRequestContext;
    let call: AdminCall;
    let page: Page;
    let email: string;
    let dealerId: number;
    let accountId: number;
    const cars: number[] = [];
    let photoId: number | null = null;

    test.beforeAll(async ({ browser, playwright, baseURL }) => {
      request = await playwright.request.newContext({ baseURL });
      call = adminCaller(request);
      dealerId = await dealerAId(request);

      // Whatever an earlier run left connected for dealer A goes first.
      const old = await call((headers) =>
        request.get(`/api/social-accounts?where[dealer][equals]=${dealerId}&limit=50&depth=0`, {
          headers,
        }),
      );
      expect(old.ok(), await old.text()).toBe(true);
      for (const row of ((await old.json()) as { docs: { id: number }[] }).docs) {
        await call((headers) => request.delete(`/api/social-accounts/${row.id}`, { headers }));
      }

      photoId = await makePhoto(request, call);
      cars.push(await makeCar(request, call, dealerId, photoId));
      ({ page, email } = await signedInDealer(browser, request, call, dealerId, "social"));
    });

    test.afterAll(async () => {
      await page?.context().close();
      const posts = await call((headers) =>
        request.get(`/api/social-posts?where[dealer][equals]=${dealerId}&limit=100&depth=0`, {
          headers,
        }),
      );
      for (const row of ((await posts.json()) as { docs: { id: number }[] }).docs) {
        await call((headers) => request.delete(`/api/social-posts/${row.id}`, { headers }));
      }
      if (accountId) {
        await call((headers) => request.delete(`/api/social-accounts/${accountId}`, { headers }));
      }
      for (const id of cars) {
        await call((headers) => request.delete(`/api/vehicles/${id}`, { headers }));
      }
      if (email) await deleteUserByEmail(request, call, email);
      if (photoId) await call((headers) => request.delete(`/api/media/${photoId}`, { headers }));
    });

    test("before anything is connected, the page says how it will work", async () => {
      await page.goto("/portal/social");
      await expect(
        page.getByRole("heading", { level: 1, name: "Your Facebook and Instagram" }),
      ).toBeVisible();
      await expect(page.getByText("Nothing connected yet.")).toBeVisible();
      await expectNoAxeViolations(page);
      await expectNoOverflow(page);
    });

    test("connecting with no Meta app on the host says so", async () => {
      await page.goto("/api/portal/social/connect");
      await expect(page).toHaveURL(/\/portal\/social\?problem=not-ready$/);
      await expect(page.locator(".rn-portal-problem")).toContainText("not switched on yet");
    });

    test("a connected Page shows, and no API ever returns its token", async () => {
      const made = await call((headers) =>
        request.post("/api/social-accounts", {
          headers,
          data: {
            dealer: dealerId,
            network: "facebook",
            displayName: "Highveld Test Page",
            externalId: "100000000000001",
            pageId: "100000000000001",
            state: "connected",
            connectedAt: new Date(Date.now() - 60_000).toISOString(),
            // Sent on purpose. Its field takes no writes from any API, so it must not be stored.
            token: "EAAB-should-never-be-kept",
          },
        }),
      );
      expect(made.status(), await made.text()).toBe(201);
      accountId = ((await made.json()) as { doc: { id: number } }).doc.id;

      const asAdmin = await call((headers) =>
        request.get(`/api/social-accounts/${accountId}?depth=0`, { headers }),
      );
      expect(JSON.stringify(await asAdmin.json())).not.toContain("EAAB");

      // Dealer B sees none of dealer A's connections.
      const ownerB = await tokenFor(request, FIXTURES.ownerB, FIXTURE_PASSWORD);
      const asB = await request.get(`/api/social-accounts?limit=100&depth=0`, {
        headers: auth(ownerB),
      });
      const seen = ((await asB.json()) as { docs: { id: number }[] }).docs.map((row) => row.id);
      expect(seen).not.toContain(accountId);

      await page.goto("/portal/social");
      await expect(
        page.locator(".rn-portal-lead__who").filter({ hasText: "Highveld Test Page" }),
      ).toBeVisible();
    });

    test("Post now from the Ad studio queues it, and the outcome shows on Social", async () => {
      await page.goto("/portal/ads");
      const target = page.getByRole("checkbox", { name: /Facebook: Highveld Test Page/ });
      await expect(target).toBeChecked();
      const postNow = page.getByRole("button", { name: "Post now" });
      // Enabled once the ad has been drawn.
      await expect(postNow).toBeEnabled({ timeout: 30_000 });
      await postNow.click();
      await expect(page.getByRole("status").filter({ hasText: "Sent." })).toBeVisible({
        timeout: 30_000,
      });
      await expectNoAxeViolations(page);

      // The test Page has no token, so the publisher must refuse it and say why.
      await expect(async () => {
        await page.goto("/portal/social");
        await expect(page.getByText("Did not post").first()).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 30_000 });
      await expect(page.getByText(/no longer connected/).first()).toBeVisible();
    });

    test("with automatic posting on, a new car is queued for the next free slot", async () => {
      await page.goto("/portal/social");
      await page.getByRole("button", { name: /Post new cars automatically/ }).click();
      await expect(page.getByRole("button", { name: /New cars post automatically/ })).toBeVisible();

      const carId = await makeCar(request, call, dealerId, photoId ?? undefined);
      cars.push(carId);

      await expect(async () => {
        const res = await call((headers) =>
          request.get(
            `/api/social-posts?where[vehicle][equals]=${carId}&where[kind][equals]=auto&depth=0`,
            { headers },
          ),
        );
        const docs = ((await res.json()) as { docs: { runAfter: string }[] }).docs;
        expect(docs).toHaveLength(1);
        const hour = Number(
          new Intl.DateTimeFormat("en-ZA", {
            hour: "2-digit",
            hourCycle: "h23",
            timeZone: "Africa/Johannesburg",
          }).format(new Date(docs[0]?.runAfter ?? "")),
        );
        expect(hour).toBeGreaterThanOrEqual(8);
        expect(hour).toBeLessThan(18);
      }).toPass({ timeout: 20_000 });
    });
  });
