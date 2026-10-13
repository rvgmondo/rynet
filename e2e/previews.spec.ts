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
        doc: { id: number; token: string; filename: string; url?: string };
      }
    ).doc;
    expect(doc.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);

    // A visitor with no cookies at all: the dealership opening the link.
    const stranger = await playwright.request.newContext({ baseURL });
    try {
      const page = await stranger.get(`/preview/${doc.token}`);
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

      // A wrong code and a malformed one say nothing about which codes exist.
      expect((await stranger.get(`/preview/${doc.token.slice(0, -2)}xx`)).status()).toBe(404);
      expect((await stranger.get("/preview/short")).status()).toBe(404);

      // The uploaded file itself is staff only, by every route Payload offers.
      expect((await stranger.get(`/api/previews/${doc.id}`)).status()).toBe(403);
      expect((await stranger.get(`/api/previews/file/${doc.filename}`)).status()).not.toBe(200);
    } finally {
      await stranger.dispose();
    }

    // Counted once, for the stranger.
    const afterStranger = (await (
      await call((headers) => request.get(`/api/previews/${doc.id}?depth=0`, { headers }))
    ).json()) as { viewCount: number; firstViewedAt: string | null };
    expect(afterStranger.viewCount).toBe(1);
    expect(afterStranger.firstViewedAt).toBeTruthy();

    // Staff checking it does not count as the dealership opening it.
    await call((headers) => request.get(`/preview/${doc.token}`, { headers }));
    const afterStaff = (await (
      await call((headers) => request.get(`/api/previews/${doc.id}?depth=0`, { headers }))
    ).json()) as { viewCount: number };
    expect(afterStaff.viewCount).toBe(1);

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
    const doc = ((await created.json()) as { doc: { id: number; token: string } }).doc;
    try {
      await page.goto(`/preview/${doc.token}`);
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
