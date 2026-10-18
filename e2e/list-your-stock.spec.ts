import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { renderEverything } from "./axe-context";
import { adminCaller } from "./portal-helpers";

/**
 * /list-your-stock, the page that sells listing to a dealership, and the sign-up on it.
 *
 * The sign-up has to land on the onboarding desk and be closed by it, so the last test walks the
 * whole path: a dealership signs up on the public page, staff find it on the desk, and onboarding
 * it closes the sign-up. Everything it makes is taken away again.
 */

const PATH = "/list-your-stock";
const WIDTHS = [320, 375, 768, 1024, 1440];

test.describe("the page", () => {
  test("says the dealership does nothing, and has no axe violations", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { level: 1, name: "Your cars on Rynet. We do the work." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Put my cars on Rynet" })).toBeVisible();
    await expect(page.getByText("Requires legal review").first()).toBeVisible();

    await renderEverything(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const v of results.violations) {
      console.error(`\n${v.id} (${v.impact}): ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
    }
    expect(results.violations).toEqual([]);
  });

  test("never quotes a number it cannot stand behind", async ({ page }) => {
    await page.goto(PATH);
    const text = await page.locator("main").innerText();
    // No buyer counts, visitor counts or "join 500 dealers" on a page Rynet cannot back up yet.
    expect(text).not.toMatch(/\b\d[\d\s,]*\+?\s*(buyers|visitors|dealers|dealerships|views)\b/i);
  });

  for (const width of WIDTHS) {
    test(`fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PATH);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("is where every List your stock button goes", async ({ page }) => {
    for (const path of ["/", "/dealers"]) {
      await page.goto(path);
      const links = page.getByRole("link", { name: /List your stock/ });
      await expect(links.first()).toHaveAttribute("href", PATH);
    }
  });
});

test.describe("signing up", () => {
  test("asks again for what is missing, in words", async ({ page }) => {
    await page.goto(PATH);
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Put my cars on Rynet" }).click();
    await expect(page.getByText("A few answers need fixing first.")).toBeVisible();
    await expect(page.getByText("The name of the dealership.")).toBeVisible();
  });

  test("lands on the onboarding desk, and onboarding closes it", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "the desktop run covers the round trip");
    const call = adminCaller(request);
    const name = `Signup Test Motors ${Date.now()}`;

    await page.goto(PATH);
    const form = page.locator("#sign-up");
    await form.getByLabel("Dealership name").fill(name);
    await form.getByLabel("Your name").fill("Pat Tester");
    await form.getByLabel("Phone or WhatsApp").fill("082 555 1234");
    await form.getByLabel("Town").fill("Pretoria");
    await form.getByLabel("Cars on your floor").selectOption("20_50");
    await form.getByRole("checkbox").check();
    // The form refuses anything sent faster than a person could fill it in.
    await page.waitForTimeout(3200);
    await form.getByRole("button", { name: "Put my cars on Rynet" }).click();
    await expect(form.getByRole("heading", { name: "You are on the list" })).toBeVisible();

    const found = (await (
      await call((headers) =>
        request.get(
          `/api/leads?where[type][equals]=dealer_signup&where[name][equals]=Pat%20Tester&sort=-createdAt&limit=1&depth=0`,
          { headers },
        ),
      )
    ).json()) as { docs: { id: number; message: string; consent: number }[] };
    const lead = found.docs[0];
    expect(lead?.message).toContain(`Dealership: ${name}`);
    let dealerId: number | null = null;

    try {
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
            tradingName: name,
            contactName: "Pat Tester",
            phone: "082 555 1234",
            addressLine1: "1 Test Street",
            cityId: pretoria?.id,
            provinceId: pretoria?.province,
            confirmedHow: "Automated test record.",
            signupLeadId: lead?.id,
          },
        }),
      );
      expect(created.status(), await created.text()).toBe(201);
      dealerId = ((await created.json()) as { dealerId: number }).dealerId;

      const closed = (await (
        await call((headers) => request.get(`/api/leads/${lead?.id}?depth=0`, { headers }))
      ).json()) as { status: string; notes: { body: string }[] };
      expect(closed.status).toBe("sold");
      expect(closed.notes.at(-1)?.body).toContain(`Onboarded as ${name}`);
    } finally {
      if (dealerId) {
        await call((headers) =>
          request.delete(`/api/branches?where[dealer][equals]=${dealerId}`, { headers }),
        );
        await call((headers) => request.delete(`/api/dealers/${dealerId}`, { headers }));
      }
      if (lead) {
        await call((headers) => request.delete(`/api/leads/${lead.id}`, { headers }));
        await call((headers) =>
          request.delete(`/api/consent-records/${lead.consent}`, { headers }),
        );
      }
    }
  });
});
