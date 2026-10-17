import { type APIRequestContext, type APIResponse, expect, test } from "@playwright/test";

/**
 * Website mockups and their private links (/preview/<token>).
 *
 * The things that must hold: the link shows the mockup to anyone who has it, sandboxed and
 * hidden from search engines; an open is counted, but not one by Rynet staff; and the uploaded
 * file itself is never reachable any other way.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

function adminCaller(request: APIRequestContext) {
  let token: string | null = null;
  const login = async () => {
    const res = await request.post("/api/users/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.ok()).toBe(true);
    return ((await res.json()) as { token: string }).token;
  };
  // Signed in again once if another suite's sign-in dropped the shared admin session.
  return async (send: (headers: Record<string, string>) => Promise<APIResponse>) => {
    token ??= await login();
    const first = await send({ Authorization: `JWT ${token}` });
    if (first.status() !== 401 && first.status() !== 403) return first;
    token = await login();
    return send({ Authorization: `JWT ${token}` });
  };
}

const MOCKUP = `<!doctype html><html><head><title>Mockup</title></head><body><h1>Preview test homepage</h1><script>document.body.dataset.ran = "yes";</script></body></html>`;

test.describe("a mockup's private link", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  test("shows the mockup to whoever has it, safely, and counts the opens", async ({
    request,
    playwright,
    baseURL,
  }) => {
    const call = adminCaller(request);
    const created = await call((headers) =>
      request.post("/api/previews", {
        headers,
        multipart: {
          file: {
            name: `preview-test-${Date.now()}.html`,
            mimeType: "text/html",
            buffer: Buffer.from(MOCKUP),
          },
          _payload: JSON.stringify({
            dealership: 'Preview Test Motors <b>"&',
            contactName: "Lee Tester",
          }),
        },
      }),
    );
    expect(created.status(), await created.text()).toBe(201);
    const doc = (
      (await created.json()) as {
        doc: {
          id: number;
          token: string;
          slug: string;
          filename: string;
          expiresAt: string;
          stage: string;
        };
      }
    ).doc;
    // A readable link made from the name, a fresh mockup not yet sent, and an end date ahead.
    expect(doc.slug).toMatch(/^preview-test-motors-b(-\d+)?$/);
    expect(doc.stage).toBe("draft");
    expect(Date.parse(doc.expiresAt)).toBeGreaterThan(Date.now() + 25 * 86_400_000);

    // A visitor with no cookies at all: the dealership opening the link.
    const stranger = await playwright.request.newContext({ baseURL });
    try {
      const page = await stranger.get(`/p/${doc.slug}`);
      expect(page.status()).toBe(200);
      const html = await page.text();
      expect(html).toContain("Preview test homepage");
      expect(html).toContain("A website concept by");
      // The dealership's name is shown as text, never as markup.
      expect(html).not.toContain('<b>"&');

      const headers = page.headers();
      expect(headers["content-security-policy"]).toContain("sandbox allow-scripts");
      expect(headers["content-security-policy"]).not.toContain("allow-same-origin");
      expect(headers["x-robots-tag"]).toContain("noindex");
      expect(headers["cache-control"]).toContain("no-store");

      // The older /preview/<code> link still opens the same mockup.
      expect((await stranger.get(`/preview/${doc.token}`)).status()).toBe(200);

      // A wrong name and a malformed one say nothing about which names exist.
      expect((await stranger.get(`/p/${doc.slug}-nope`)).status()).toBe(404);
      expect((await stranger.get("/p/NOT%20valid")).status()).toBe(404);
      expect((await stranger.get("/preview/short")).status()).toBe(404);

      // The uploaded file itself is staff only, by every route Payload offers.
      expect((await stranger.get(`/api/previews/${doc.id}`)).status()).toBe(403);
      expect((await stranger.get(`/api/previews/file/${doc.filename}`)).status()).not.toBe(200);
    } finally {
      await stranger.dispose();
    }

    // Counted twice, for the stranger's two opens.
    const afterStranger = (await (
      await call((headers) => request.get(`/api/previews/${doc.id}?depth=0`, { headers }))
    ).json()) as { viewCount: number; firstViewedAt: string | null };
    expect(afterStranger.viewCount).toBe(2);
    expect(afterStranger.firstViewedAt).toBeTruthy();

    // Staff checking it does not count as the dealership opening it.
    await call((headers) => request.get(`/p/${doc.slug}`, { headers }));
    const afterStaff = (await (
      await call((headers) => request.get(`/api/previews/${doc.id}?depth=0`, { headers }))
    ).json()) as { viewCount: number };
    expect(afterStaff.viewCount).toBe(2);

    // Ended: the dealership sees a note, staff still see the mockup.
    await call((headers) =>
      request.patch(`/api/previews/${doc.id}`, {
        headers,
        data: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
      }),
    );
    const late = await playwright.request.newContext({ baseURL });
    try {
      const ended = await late.get(`/p/${doc.slug}`);
      expect(ended.status()).toBe(410);
      const note = await ended.text();
      expect(note).toContain("This preview has ended");
      expect(note).not.toContain("Preview test homepage");
      expect(ended.headers()["x-robots-tag"]).toContain("noindex");
    } finally {
      await late.dispose();
    }
    const staffView = await call((headers) => request.get(`/p/${doc.slug}`, { headers }));
    expect(await staffView.text()).toContain("Preview test homepage");

    await call((headers) => request.delete(`/api/previews/${doc.id}`, { headers }));
  });

  test("runs its scripts in a sandbox", async ({ page, request }) => {
    const call = adminCaller(request);
    const created = await call((headers) =>
      request.post("/api/previews", {
        headers,
        multipart: {
          file: {
            name: `preview-sandbox-${Date.now()}.html`,
            mimeType: "text/html",
            buffer: Buffer.from(MOCKUP),
          },
          _payload: JSON.stringify({ dealership: "Sandbox Test Motors" }),
        },
      }),
    );
    const doc = ((await created.json()) as { doc: { id: number; slug: string } }).doc;
    try {
      await page.goto(`/p/${doc.slug}`);
      await expect(page.getByRole("heading", { name: "Preview test homepage" })).toBeVisible();
      // Its own script ran, in an opaque origin with no access to Rynet's storage.
      await expect(page.locator("body")).toHaveAttribute("data-ran", "yes");
      const origin = await page.evaluate(() => window.origin);
      expect(origin).toBe("null");
    } finally {
      await call((headers) => request.delete(`/api/previews/${doc.id}`, { headers }));
    }
  });
});
