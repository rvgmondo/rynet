import { expect, type Page, test } from "@playwright/test";
import { adminCaller } from "./portal-helpers";

/**
 * A dealership's stock on its own website: the feed (/api/stock/<slug>) and the one-line embed
 * (/embed/stock.js), tested the way a dealer's site uses them, from another origin.
 */

/**
 * Opens a stand-in for a dealership's own website, on an origin that is not Rynet's.
 *
 * The page is served by the test itself at 127.0.0.1 when the site under test is localhost (and
 * the other way round), so the embed is genuinely loaded cross-origin. Not about:blank: Chrome
 * refuses to let a page with no origin load anything from a loopback address at all, a rule a
 * real dealership's website on the internet never meets.
 */
async function openDealerSite(page: Page, baseURL: string | undefined, html: string) {
  const base = new URL(baseURL ?? "http://localhost:3100");
  const other = new URL(base);
  other.hostname = base.hostname === "localhost" ? "127.0.0.1" : "localhost";
  const address = `${other.origin}/dealer-site-stand-in`;
  await page.route(address, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: html }),
  );
  await page.goto(address);
}

/*
 * Chrome now asks before any page reaches a loopback address (Local Network Access), and in a
 * headless test there is nobody to say yes. Both ends are on this machine only because this is a
 * test: a dealership's website on the internet loading rynet.co.za never meets the check. So it
 * is switched off for this file's browser, and nowhere else.
 */
test.use({
  launchOptions: {
    args: [
      "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults",
    ],
  },
});

test.describe("the stock feed and embed", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  test("refuses a dealership that does not exist, plainly", async ({ request }) => {
    const res = await request.get("/api/stock/no-such-dealership-here");
    expect(res.status()).toBe(404);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    expect((await request.get("/api/stock/NOT valid")).status()).toBe(404);
  });

  test("serves a verified dealership's live stock to any website", async ({
    request,
    page,
    baseURL,
  }) => {
    const call = adminCaller(request);
    const pretoria = (
      (await (
        await call((headers) =>
          request.get("/api/cities?where[name][equals]=Pretoria&depth=0", { headers }),
        )
      ).json()) as { docs: { id: number; province: number }[] }
    ).docs[0];
    const created = await call((headers) =>
      request.post("/api/onboard/dealership", {
        headers,
        data: {
          tradingName: `Embed Test Motors ${Date.now()}`,
          contactName: "Embed Tester",
          phone: "082 555 1234",
          addressLine1: "1 Test Street",
          cityId: pretoria?.id,
          provinceId: pretoria?.province,
          confirmedHow: "Automated test record.",
        },
      }),
    );
    expect(created.status(), await created.text()).toBe(201);
    const { dealerId, slug } = (await created.json()) as { dealerId: number; slug: string };

    try {
      const feed = await request.get(`/api/stock/${slug}`);
      expect(feed.status()).toBe(200);
      expect(feed.headers()["access-control-allow-origin"]).toBe("*");
      const body = (await feed.json()) as {
        dealer: { name: string; showroomUrl: string };
        count: number;
        cars: unknown[];
      };
      expect(body.dealer.name).toContain("Embed Test Motors");
      expect(body.dealer.showroomUrl).toMatch(new RegExp(`/dealers/${slug}$`));
      expect(body.count).toBe(0);
      expect(body.cars).toEqual([]);

      const script = await request.get("/embed/stock.js");
      expect(script.status()).toBe(200);
      expect(script.headers()["content-type"]).toContain("javascript");

      // A dealer's own website: a page on another origin, with the two lines pasted in.
      await openDealerSite(
        page,
        baseURL,
        `<!doctype html><html><body><main><div data-rynet-stock="${slug}"></div></main><script src="${baseURL}/embed/stock.js" async></script></body></html>`,
      );
      const widget = page.locator(`[data-rynet-stock="${slug}"]`);
      await expect(widget.getByText("No cars in stock right now")).toBeVisible();
      await expect(widget.getByRole("link", { name: "Rynet" })).toBeVisible();
    } finally {
      await call((headers) =>
        request.delete(`/api/branches?where[dealer][equals]=${dealerId}`, { headers }),
      );
      await call((headers) => request.delete(`/api/dealers/${dealerId}`, { headers }));
    }
  });

  test("draws real cars as links when a dealership has them", async ({
    request,
    page,
    baseURL,
  }) => {
    // Any verified dealership with live, photographed stock. The seed may have none; then this
    // has nothing to check and says so rather than pretending.
    const dealers = (await (
      await request.get(
        "/api/dealers?where[verificationStatus][equals]=verified&where[isDemonstration][not_equals]=true&limit=20&depth=0",
      )
    ).json()) as { docs: { slug: string }[] };
    let slug: string | null = null;
    for (const dealer of dealers.docs) {
      const feed = (await (await request.get(`/api/stock/${dealer.slug}`)).json()) as {
        count?: number;
      };
      if ((feed.count ?? 0) > 0) {
        slug = dealer.slug;
        break;
      }
    }
    test.skip(!slug, "no real dealership with live stock in this database");

    await openDealerSite(
      page,
      baseURL,
      `<!doctype html><html><body><div data-rynet-stock="${slug}" data-limit="3"></div><script src="${baseURL}/embed/stock.js" async></script></body></html>`,
    );
    const cards = page
      .locator(`[data-rynet-stock="${slug}"]`)
      .getByRole("link")
      .filter({
        has: page.getByRole("heading"),
      });
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toHaveAttribute("href", /\/vehicles\//);
  });
});
