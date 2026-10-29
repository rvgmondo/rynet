import { expect, test } from "@playwright/test";

/**
 * A car view and a WhatsApp tap, followed all the way into the dealership's monthly report.
 *
 * The suite runs with VIEW_FLUSH_MS=0, so a view is written at once instead of a minute later,
 * and with REPORT_KEY set, so the report route can be read without signing in.
 */

const PERSON = {
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
};

const thisMonth = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" })
    .format(new Date())
    .slice(0, 7);

test("a view and a WhatsApp tap reach the monthly report", async ({ request }) => {
  const listed = await request.get("/api/vehicles?limit=1&depth=0&where[status][equals]=live");
  const car = (await listed.json()).docs[0] as { publicRef: string; dealer: number };
  expect(car?.publicRef).toBeTruthy();

  const before = await request.get(
    `/api/admin/dealer-report?dealer=${car.dealer}&month=${thisMonth()}`,
    {
      headers: { "x-report-key": "e2e-report-key" },
    },
  );
  expect(before.status()).toBe(200);
  const start = (await before.json()).stats;

  expect(
    (
      await request.post("/api/track/view", {
        headers: PERSON,
        data: { vehicleRef: car.publicRef },
      })
    ).status(),
  ).toBe(204);
  expect(
    (
      await request.post("/api/track/whatsapp", {
        headers: PERSON,
        data: { vehicleRef: car.publicRef },
      })
    ).status(),
  ).toBe(204);
  // The same visitor opening the same car again the same day is one view, not two.
  await request.post("/api/track/view", { headers: PERSON, data: { vehicleRef: car.publicRef } });

  const after = await request.get(
    `/api/admin/dealer-report?dealer=${car.dealer}&month=${thisMonth()}`,
    {
      headers: { "x-report-key": "e2e-report-key" },
    },
  );
  const report = await after.json();
  expect(report.stats.views).toBe(start.views + 1);
  expect(report.stats.whatsappTaps).toBe(start.whatsappTaps + 1);
  expect(report.subject).toMatch(/^Your cars on Rynet in /);
  expect(report.body).toContain("Your numbers for");
});

test("a crawler's view is not counted", async ({ request }) => {
  const listed = await request.get(
    "/api/vehicles?limit=1&depth=0&where[status][equals]=live&sort=-createdAt",
  );
  const car = (await listed.json()).docs[0] as { publicRef: string; dealer: number };
  const read = async () =>
    (
      await (
        await request.get(`/api/admin/dealer-report?dealer=${car.dealer}&month=${thisMonth()}`, {
          headers: { "x-report-key": "e2e-report-key" },
        })
      ).json()
    ).stats.views as number;
  const start = await read();
  await request.post("/api/track/view", {
    headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    data: { vehicleRef: car.publicRef },
  });
  expect(await read()).toBe(start);
});

test("the report is not open to the public", async ({ request }) => {
  expect((await request.get("/api/admin/dealer-report?dealer=1&month=2026-10")).status()).toBe(403);
  expect(
    (
      await request.get("/api/admin/dealer-report?dealer=1&month=2026-10", {
        headers: { "x-report-key": "wrong" },
      })
    ).status(),
  ).toBe(403);
});
