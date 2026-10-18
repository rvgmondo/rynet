import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";
import { renderEverything } from "./axe-context";
import { type AdminCall, adminCaller, auth, sharedAdminToken, tokenFor } from "./portal-helpers";

/**
 * Admin > Mailer, and the "Stop these emails" link every mailing carries.
 *
 * A test run has no mail server, which is the point of half of this: a mailing must wait as
 * "Waiting" and the screen must say why, never claim it was sent. Dealer A gets a real address for
 * the run and dealer B none, so one send shows both a queued copy and one left out with its reason.
 *
 * Desktop only: one dealership's opt-out is shared state.
 */

test.skip(({ isMobile }) => isMobile, "shared dealership state, desktop only");

const ROUTES = [
  "/api/mailer/preview",
  "/api/mailer/test",
  "/api/mailer/send",
  "/api/mailer/template",
];

test("the Mailer's routes refuse a stranger and a dealership", async ({ request }) => {
  const owner = await tokenFor(request, FIXTURES.ownerA, FIXTURE_PASSWORD);
  for (const path of ROUTES) {
    expect((await request.post(path, { data: {} })).status(), path).toBe(403);
    expect((await request.post(path, { headers: auth(owner), data: {} })).status(), path).toBe(403);
  }
});

async function openAdmin(page: Page, baseURL: string | undefined, path: string) {
  const token = sharedAdminToken();
  test.skip(!token, "no shared admin token (e2e/global-setup.ts)");
  const { hostname } = new URL(baseURL ?? "http://localhost:3100");
  await page
    .context()
    .addCookies([
      { name: "payload-token", value: token ?? "", domain: hostname, path: "/", httpOnly: true },
    ]);
  await page.goto(path);
}

test.describe
  .serial("emailing dealerships", () => {
    let request: APIRequestContext;
    let call: AdminCall;
    // Two real dealerships made for the run, because the Mailer never emails an example one:
    // "with" has an address for its principal, "without" has none.
    let withEmail: number;
    let withoutEmail: number;
    const stamp = Date.now();
    const mailings: number[] = [];
    let unsubscribe: URL;

    test.beforeAll(async ({ playwright, baseURL }, info) => {
      // The file skips its tests on the phone project, but not its hooks: without this the
      // phone run would set up and tear down the same dealership under the desktop run.
      if (info.project.name === "mobile") return;
      request = await playwright.request.newContext({ baseURL });
      call = adminCaller(request);
      const places = await (
        await call((headers) =>
          request.get("/api/cities?where[name][equals]=Pretoria&depth=0", { headers }),
        )
      ).json();
      const pretoria = places.docs[0] as { id: number; province: number };
      expect(pretoria, "the seed has no Pretoria").toBeTruthy();
      const make = async (name: string, email: string | null) => {
        const res = await call((headers) =>
          request.post("/api/onboard/dealership", {
            headers,
            data: {
              tradingName: name,
              contactName: "Lerato Mokoena",
              email,
              phone: "082 555 1234",
              addressLine1: "1 Test Street",
              cityId: pretoria.id,
              provinceId: pretoria.province,
              confirmedHow: "Automated test record.",
            },
          }),
        );
        expect(res.status(), await res.text()).toBe(201);
        return ((await res.json()) as { dealerId: number }).dealerId;
      };
      withEmail = await make(`Mailer Test Motors ${stamp}`, "principal@rynet.test");
      withoutEmail = await make(`Mailer Quiet Motors ${stamp}`, null);
    });

    test.afterAll(async ({ playwright: _playwright }, info) => {
      if (info.project.name === "mobile") return;
      for (const id of mailings) {
        const rows = await call((headers) =>
          request.get(`/api/mail-deliveries?where[mailing][equals]=${id}&limit=100&depth=0`, {
            headers,
          }),
        );
        for (const row of ((await rows.json()) as { docs: { id: number }[] }).docs) {
          await call((headers) => request.delete(`/api/mail-deliveries/${row.id}`, { headers }));
        }
        await call((headers) => request.delete(`/api/mailings/${id}`, { headers }));
      }
      for (const id of [withEmail, withoutEmail]) {
        if (!id) continue;
        await call((headers) =>
          request.delete(`/api/branches?where[dealer][equals]=${id}`, { headers }),
        );
        await call((headers) => request.delete(`/api/dealers/${id}`, { headers }));
      }
    });

    test("the screen composes, previews for a real dealership, and passes axe", async ({
      page,
      baseURL,
    }) => {
      test.setTimeout(90_000);
      await openAdmin(page, baseURL, "/admin/mailer");
      const desk = page.locator(".rn-mailer");
      await expect(desk.getByRole("heading", { level: 1, name: "Mailer" })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page).toHaveTitle(/^Mailer \| Rynet admin$/);
      // No mail server in a test run, and the screen says so rather than pretending.
      await expect(desk.getByRole("note")).toContainText("no mail server");

      await desk.getByLabel("Start from").selectOption({ label: "Enquiries waiting" });
      await expect(desk.getByLabel("Subject")).toHaveValue(/Buyers are waiting/);

      // The preview is the real email, personalised for the dealership chosen.
      // Previewed as whichever real dealership is listed first (example dealerships get no mail).
      const as = desk.getByLabel("Preview it as");
      const name = (await as.locator("option:checked").textContent())?.trim() ?? "";
      expect(name).not.toBe("");
      const frame = page.frameLocator("iframe.rn-mailer__frame");
      await expect(frame.getByRole("heading", { level: 1 })).toContainText(
        `Buyers are waiting to hear from ${name}`,
        { timeout: 15_000 },
      );
      await expect(frame.getByText("Stop these emails")).toBeVisible();

      // A field Rynet cannot fill is refused before anything can be sent.
      await desk.getByLabel("Subject").fill("Hello {{dealrship}}");
      await expect(desk.getByText(/Rynet cannot fill \{\{dealrship\}\}/)).toBeVisible({
        timeout: 15_000,
      });

      await renderEverything(page);
      const results = await new AxeBuilder({ page })
        .include(".rn-mailer")
        // The preview is a sandboxed frame showing the email itself, which axe cannot enter.
        .exclude("iframe.rn-mailer__frame")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      for (const v of results.violations) console.error(`${v.id}: ${v.help}`);
      expect(results.violations).toEqual([]);
    });

    test("a send waits without a mail server, and leaves out a dealership with no address", async () => {
      const res = await call((headers) =>
        request.post("/api/mailer/send", {
          headers,
          data: {
            subject: "Test mailing for {{dealership}}",
            body: "Hi {{firstName}}, this is a test.",
            dealerIds: [withEmail, withoutEmail],
            audience: "Mailer test",
          },
        }),
      );
      expect(res.ok(), await res.text()).toBe(true);
      const sent = (await res.json()) as {
        mailingId: number;
        queued: number;
        leftOut: number;
        mailServer: boolean;
      };
      mailings.push(sent.mailingId);
      expect(sent).toMatchObject({ queued: 1, leftOut: 1, mailServer: false });

      const rows = await call((headers) =>
        request.get(`/api/mail-deliveries?where[mailing][equals]=${sent.mailingId}&depth=0`, {
          headers,
        }),
      );
      const docs = (await rows.json()).docs as { status: string; to: string; error?: string }[];
      expect(docs.find((row) => row.to === "principal@rynet.test")?.status).toBe("queued");
      expect(docs.find((row) => row.status === "skipped")?.error).toMatch(/No email address/);
    });

    test("Stop these emails asks once, then opts the dealership out", async ({ page }) => {
      await page.goto(`/unsubscribe?d=${withEmail}&t=${"0".repeat(32)}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link does not work");

      // The link exactly as this dealership's email carries it, made by the server with its secret.
      const preview = await call((headers) =>
        request.post("/api/mailer/preview", {
          headers,
          data: { subject: "x", body: "x", dealerId: withEmail },
        }),
      );
      const html = ((await preview.json()) as { html: string }).html;
      const link = html.match(/href="([^"]*\/unsubscribe\?[^"]+)"/)?.[1]?.replaceAll("&#38;", "&");
      expect(link, "the email has no unsubscribe link").toBeTruthy();
      unsubscribe = new URL(link ?? "");
      await page.goto(`${unsubscribe.pathname}${unsubscribe.search}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        `Stop Rynet's emails to Mailer Test Motors ${stamp}?`,
      );
      // Visiting changed nothing: a mail filter that opens every link must not opt anybody out.
      let doc = await (
        await call((headers) => request.get(`/api/dealers/${withEmail}?depth=0`, { headers }))
      ).json();
      expect(doc.emailOptOut).toBe(false);

      await page.getByRole("button", { name: "Stop these emails" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Done. No more of these emails.",
      );
      doc = await (
        await call((headers) => request.get(`/api/dealers/${withEmail}?depth=0`, { headers }))
      ).json();
      expect(doc.emailOptOut).toBe(true);
    });

    test("one-click unsubscribe from a mail app works, and a forged one does not", async () => {
      const code = unsubscribe.searchParams.get("t");
      expect(
        (await request.post(`/api/unsubscribe?d=${withEmail}&t=${"0".repeat(32)}`)).status(),
      ).toBe(404);
      expect((await request.post(`/api/unsubscribe?d=${withEmail}&t=${code}`)).status()).toBe(200);
    });
  });

test("Admin > Social shows Rynet's own accounts, every post, and passes axe", async ({
  page,
  baseURL,
}) => {
  await openAdmin(page, baseURL, "/admin/social");
  const screen = page.locator(".rn-social");
  await expect(screen.getByRole("heading", { level: 1, name: "Social" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page).toHaveTitle(/^Social \| Rynet admin$/);
  await expect(screen.getByRole("heading", { level: 2, name: "Rynet's accounts" })).toBeVisible();
  // No Meta app in a test run: it says what is missing rather than offering a dead button.
  await expect(screen.getByText(/Posting is not switched on yet/)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin menu" }).getByRole("link", { name: "Social" }),
  ).toHaveAttribute("href", "/admin/social");

  await renderEverything(page);
  const results = await new AxeBuilder({ page })
    .include(".rn-social")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  for (const v of results.violations) console.error(`${v.id}: ${v.help}`);
  expect(results.violations).toEqual([]);
});

test("Rynet's post route refuses anyone who is not staff", async ({ request }) => {
  const owner = await tokenFor(request, FIXTURES.ownerA, FIXTURE_PASSWORD);
  const post = (headers?: Record<string, string>) =>
    request.post("/api/admin/social/post", { headers, multipart: { caption: "x" } });
  expect((await post()).status()).toBe(403);
  expect((await post(auth(owner))).status()).toBe(403);
});
