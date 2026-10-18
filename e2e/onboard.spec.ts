import { type APIResponse, expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";
import { adminCaller, tokenFor } from "./portal-helpers";

/**
 * The onboarding desk's routes, over HTTP.
 *
 * Every route but the template creates dealerships, switches feeds on or writes cars, so the
 * first half of this file is the gate: nobody but platform staff gets past it, including a
 * dealership's own owner. The second half walks one dealership through the desk the way staff
 * would, and takes it away again afterwards.
 *
 * Needs the fixture accounts: `npm run seed && npm run seed:fixtures`.
 */

const auth = (token: string) => ({ Authorization: `JWT ${token}` });

test.describe("the onboarding routes refuse anyone who is not staff", () => {
  // Desktop only: the mobile project would only repeat the same HTTP calls.
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  const calls = [
    { method: "post", path: "/api/onboard/probe", data: { url: "https://example.com" } },
    { method: "post", path: "/api/onboard/dealership", data: { tradingName: "X" } },
    {
      method: "post",
      path: "/api/onboard/website",
      data: { dealerId: 1, url: "https://example.com" },
    },
    { method: "get", path: "/api/onboard/status?dealerId=1" },
  ] as const;

  for (const call of calls) {
    test(`${call.method.toUpperCase()} ${call.path} refuses a stranger`, async ({ request }) => {
      const res =
        call.method === "get"
          ? await request.get(call.path)
          : await request.post(call.path, { data: "data" in call ? call.data : {} });
      expect(res.status()).toBe(403);
    });

    test(`${call.method.toUpperCase()} ${call.path} refuses a dealership's owner`, async ({
      request,
    }) => {
      const token = await tokenFor(request, FIXTURES.ownerA, FIXTURE_PASSWORD);
      const res =
        call.method === "get"
          ? await request.get(call.path, { headers: auth(token) })
          : await request.post(call.path, {
              headers: auth(token),
              data: "data" in call ? call.data : {},
            });
      expect(res.status()).toBe(403);
    });
  }

  test("the spreadsheet upload refuses a stranger", async ({ request }) => {
    const res = await request.post("/api/onboard/spreadsheet", {
      multipart: {
        dealerId: "1",
        file: { name: "stock.csv", mimeType: "text/csv", buffer: Buffer.from("Make\nFord") },
      },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("the stock template", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  test("downloads as a CSV with the headings the reader understands", async ({ request }) => {
    const res = await request.get("/api/onboard/template");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Stock number,Make,Model");
    expect(text).toContain("Photo links");
  });
});

test.describe("onboarding a dealership", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop run");

  test("creates it verified with a branch, loads a spreadsheet and holds back what is incomplete", async ({
    request,
  }) => {
    const call = adminCaller(request);
    const json = async <T>(response: Promise<APIResponse>): Promise<T> =>
      (await (await response).json()) as T;

    // The form refuses what is missing, and says what.
    const empty = await call((headers) =>
      request.post("/api/onboard/dealership", { headers, data: {} }),
    );
    expect(empty.status()).toBe(400);
    const emptyBody = (await empty.json()) as { problems: string[] };
    expect(emptyBody.problems).toContain("The dealership's name is missing.");

    const places = await json<{ docs: { id: number; province: number }[] }>(
      call((headers) =>
        request.get("/api/cities?where[name][equals]=Pretoria&depth=0", { headers }),
      ),
    );
    const pretoria = places.docs[0];
    expect(pretoria, "the seed has no Pretoria").toBeTruthy();

    const form = {
      tradingName: `Onboard Test Motors ${Date.now()}`,
      contactName: "Test Person",
      phone: "082 555 1234",
      addressLine1: "1 Test Street",
      cityId: pretoria?.id,
      provinceId: pretoria?.province,
      confirmedHow: "Automated test record.",
    };

    // A portal is not a dealership's website.
    const portal = await call((headers) =>
      request.post("/api/onboard/dealership", {
        headers,
        data: { ...form, websiteUrl: "https://www.autotrader.co.za/dealer/x" },
      }),
    );
    expect(portal.status()).toBe(400);

    const created = await call((headers) =>
      request.post("/api/onboard/dealership", { headers, data: form }),
    );
    expect(created.status(), await created.text()).toBe(201);
    const { dealerId } = (await created.json()) as { dealerId: number; slug: string };

    try {
      const dealer = await json<{ verificationStatus: string; verificationNotes: string }>(
        call((headers) => request.get(`/api/dealers/${dealerId}?depth=0`, { headers })),
      );
      expect(dealer.verificationStatus).toBe("verified");
      expect(dealer.verificationNotes).toContain("Automated test record.");
      expect(dealer.verificationNotes).toContain("Still to collect");

      const branches = await json<{ totalDocs: number }>(
        call((headers) =>
          request.get(`/api/branches?where[dealer][equals]=${dealerId}&depth=0`, { headers }),
        ),
      );
      expect(branches.totalDocs).toBe(1);

      const csv =
        "Stock No;Make;Model;Reg Year;KM;Selling Price\nE1;Toyota;Hilux;2021;64 000;R 549 900,00";
      const upload = await call((headers) =>
        request.post("/api/onboard/spreadsheet", {
          headers,
          multipart: {
            dealerId: String(dealerId),
            wholeStock: "false",
            file: { name: "stock.csv", mimeType: "text/csv", buffer: Buffer.from(csv) },
          },
        }),
      );
      expect(upload.status()).toBe(200);
      expect(((await upload.json()) as { started: boolean }).started).toBe(true);

      // Loading runs in the background. A car with no photograph is held back, never live.
      const status = () =>
        json<{ live: number; heldBack: number; lastSummary: string | null }>(
          call((headers) => request.get(`/api/onboard/status?dealerId=${dealerId}`, { headers })),
        );
      await expect.poll(async () => (await status()).heldBack, { timeout: 30_000 }).toBe(1);
      const done = await status();
      expect(done.live).toBe(0);
      expect(done.lastSummary).toContain("Spreadsheet:");
    } finally {
      const cars = await json<{ docs: { id: number }[] }>(
        call((headers) =>
          request.get(`/api/vehicles?where[dealer][equals]=${dealerId}&depth=0&limit=50`, {
            headers,
          }),
        ),
      );
      for (const car of cars.docs) {
        await call((headers) => request.delete(`/api/vehicles/${car.id}`, { headers }));
      }
      await call((headers) =>
        request.delete(`/api/branches?where[dealer][equals]=${dealerId}`, { headers }),
      );
      await call((headers) => request.delete(`/api/dealers/${dealerId}`, { headers }));
    }
  });
});
