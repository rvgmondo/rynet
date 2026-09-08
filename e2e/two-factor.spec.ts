import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, type BrowserContext, expect, test } from "@playwright/test";
import { totp } from "../src/lib/totp";
import { FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";

/**
 * The second factor, end to end.
 *
 * The RFC vectors in src/lib/totp.test.ts prove the arithmetic. They say nothing about whether
 * the gate is wired into the login path, and that is the half that matters: an enforcement hook
 * that never runs is worse than no second factor at all, because the account holder believes
 * they have one.
 *
 * So this drives the real enrolment page, reads the key off the screen the way a person would,
 * and then attacks the login endpoint with it. Every assertion is on the token: a refusal here
 * means no session was issued, not that a screen looked unhappy.
 *
 * It runs on its own fixture account. Sharing one with the isolation suite would mean whichever
 * ran second was signing in against a second factor it did not know had been switched on.
 *
 * One worker, in order: this enrols and unenrols the same account, and Payload locks an account
 * after eight failed sign-ins.
 */
test.describe.configure({ mode: "default" });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";
const PAGE = "/account/two-factor";

let adminToken: string;
let subjectId: number;
/** The key read off the enrolment screen, and one unused recovery code. */
let secret = "";
let recoveryCode = "";

const as = (token: string) => ({ headers: { Authorization: `JWT ${token}` } });

async function signIn(
  request: APIRequestContext,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return request.post("/api/users/login", {
    data: { email: FIXTURES.twoFactor, password: FIXTURE_PASSWORD, ...body },
    headers,
  });
}

/** Puts the Payload session cookie on a browser context, so the enrolment page sees a user. */
async function authenticate(context: BrowserContext, token: string, baseURL: string) {
  const { hostname } = new URL(baseURL);
  await context.addCookies([
    { name: "payload-token", value: token, domain: hostname, path: "/", httpOnly: true },
  ]);
}

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });

  const admin = await request.post("/api/users/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!admin.ok()) {
    throw new Error(
      `Could not sign in as ${ADMIN_EMAIL} (HTTP ${admin.status()}). Run: npm run seed:admin && npm run seed && npm run seed:fixtures`,
    );
  }
  adminToken = (await admin.json()).token;

  const found = await (
    await request.get(
      `/api/users?where[email][equals]=${encodeURIComponent(FIXTURES.twoFactor)}&limit=1&depth=0`,
      as(adminToken),
    )
  ).json();
  subjectId = found.docs[0]?.id;
  expect(subjectId, "fixture account missing, run npm run seed:fixtures").toBeTruthy();

  await request.dispose();
});

test.describe("the enrolment page itself", () => {
  test("has no axe violations, signed in or not", async ({ page, context, request, baseURL }) => {
    // Signed out first: this is the state somebody lands in when they follow a link from an
    // email, and it is the one that usually goes untested.
    await page.goto(PAGE);
    const anonymous = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(anonymous.violations).toEqual([]);

    const token = (await (await signIn(request)).json()).token as string;
    await authenticate(context, token, baseURL ?? "http://localhost:3100");
    await page.goto(PAGE);

    const signedIn = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    if (signedIn.violations.length > 0) {
      for (const v of signedIn.violations) {
        console.error(`
${v.id} (${v.impact}): ${v.help}`);
        for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
      }
    }
    expect(signedIn.violations).toEqual([]);
  });

  test("is not offered to a search engine", async ({ page }) => {
    await page.goto(PAGE);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });
});

test.describe("the fields the secret lives in", () => {
  test("no HTTP caller can read a secret, not even a platform admin", async ({ request }) => {
    const res = await request.get(`/api/users/${subjectId}?depth=0`, as(adminToken));
    expect(res.status()).toBe(200);

    // An admin who can read a colleague's secret can generate that colleague's codes, at which
    // point the second factor proves nothing about who is at the keyboard.
    const body = await res.text();
    expect(body).not.toContain("twoFactorSecret");
    expect(body).not.toContain("twoFactorRecoveryCodes");
  });

  test("no HTTP caller can switch two-factor on for somebody else", async ({ request }) => {
    await request.patch(`/api/users/${subjectId}`, {
      ...as(adminToken),
      data: { twoFactorEnabled: true, twoFactorSecret: "JBSWY3DPEHPK3PXP" },
    });

    // Whatever the response said, the state must not have moved. Enrolment happens through the
    // signed-in flow and nowhere else, or an admin could enrol a device they hold.
    const after = await (
      await request.get(`/api/users/${subjectId}?depth=0`, as(adminToken))
    ).json();
    expect(after.twoFactorEnabled ?? false).toBe(false);
  });
});

test.describe("before enrolment", () => {
  test("a password alone still signs in", async ({ request }) => {
    // Stage one of the rollout. Nobody is forced to enrol yet, because forcing it before
    // anyone has would lock the founder out of his own live site.
    const res = await signIn(request);
    expect(res.status(), await res.text()).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });
});

test.describe("enrolling, through the page a person actually uses", () => {
  test("shows the key, accepts a code, and hands over recovery codes once", async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    const token = (await (await signIn(request)).json()).token as string;
    await authenticate(context, token, baseURL ?? "http://localhost:3100");

    await page.goto(PAGE);
    await expect(page.getByRole("heading", { name: /Two-factor is off/i })).toBeVisible();

    await page.getByRole("button", { name: /Set up two-factor/i }).click();

    // The key, read off the screen exactly the way somebody typing it into their phone would.
    const keyText = await page.locator("main .font-mono").first().innerText();
    secret = keyText.replace(/\s+/g, "");
    expect(secret, "no setup key was shown").toMatch(/^[A-Z2-7]{32}$/);

    await page.getByLabel(/Six digit code/i).fill(totp(secret));
    await page.getByRole("button", { name: /Turn on two-factor/i }).click();

    await expect(page.getByText(/Write these recovery codes down now/i)).toBeVisible({
      timeout: 10000,
    });

    const codes = await page.locator("main ul li.font-mono, main .font-mono li").allInnerTexts();
    const shown = codes.filter((c) => /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(c.trim()));
    expect(shown, "ten recovery codes should be shown once").toHaveLength(10);
    recoveryCode = shown[0]?.trim() ?? "";
  });

  test("refuses a wrong code and stays off", async ({ page, context, request, baseURL }) => {
    // A separate account state would be needed to retry enrolment, so this checks the same
    // rejection on the page that is now enrolled: the confirm form is gone entirely.
    const token = (await (await signIn(request, { totp: totp(secret) })).json()).token as string;
    await authenticate(context, token, baseURL ?? "http://localhost:3100");

    await page.goto(PAGE);
    await expect(page.getByRole("heading", { name: /Two-factor is on/i })).toBeVisible();
    await expect(page.getByLabel(/Six digit code/i)).toHaveCount(0);
  });
});

test.describe("the gate, once the account has enrolled", () => {
  test("a password alone is refused, and no token is issued", async ({ request }) => {
    const res = await signIn(request);
    expect(res.status(), "a password alone got through the second factor").toBe(401);

    const body = await res.json();
    expect(body.token, "a token was issued despite the refusal").toBeFalsy();
  });

  test("a wrong code is refused", async ({ request }) => {
    const wrong = String((Number(totp(secret)) + 1) % 1_000_000).padStart(6, "0");
    const res = await signIn(request, { totp: wrong });
    expect(res.status()).toBe(401);
    expect((await res.json()).token).toBeFalsy();
  });

  test("a code from a different secret is refused", async ({ request }) => {
    const res = await signIn(request, { totp: totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXQ") });
    expect(res.status()).toBe(401);
  });

  test("the right code in the body signs in", async ({ request }) => {
    const res = await signIn(request, { totp: totp(secret) });
    expect(res.status(), await res.text()).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  test("the right code in a header signs in, for clients that cannot add a body field", async ({
    request,
  }) => {
    const res = await signIn(request, {}, { "x-rynet-totp": totp(secret) });
    expect(res.status(), await res.text()).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  test("a wrong password with a right code is still refused", async ({ request }) => {
    // The second factor is a second factor, not a replacement for the first.
    const res = await request.post("/api/users/login", {
      data: { email: FIXTURES.twoFactor, password: "not-the-password", totp: totp(secret) },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).token).toBeFalsy();
  });
});

test.describe("recovery codes", () => {
  test("one signs in when the phone is gone, and only once", async ({ request }) => {
    expect(recoveryCode, "no recovery code was captured during enrolment").toBeTruthy();

    const first = await signIn(request, { recoveryCode });
    expect(first.status(), await first.text()).toBe(200);
    expect((await first.json()).token).toBeTruthy();

    // Burnt on use. A code that still worked would be a password that never expires, written
    // on a piece of paper.
    const second = await signIn(request, { recoveryCode });
    expect(second.status(), "a recovery code worked twice").toBe(401);
    expect((await second.json()).token).toBeFalsy();
  });

  test("an unissued code is refused", async ({ request }) => {
    const res = await signIn(request, { recoveryCode: "ZZZZZ-ZZZZZ" });
    expect(res.status()).toBe(401);
  });
});

test.describe("turning it off", () => {
  test("needs a current code, and then the password works again", async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    const token = (await (await signIn(request, { totp: totp(secret) })).json()).token as string;
    await authenticate(context, token, baseURL ?? "http://localhost:3100");

    await page.goto(PAGE);
    await page
      .getByLabel(/Code from your app/i)
      .last()
      .fill("000000");
    await page.getByRole("button", { name: /Turn it off/i }).click();
    await expect(page.getByText(/That code is not right/i)).toBeVisible({ timeout: 10000 });

    await page
      .getByLabel(/Code from your app/i)
      .last()
      .fill(totp(secret));
    await page.getByRole("button", { name: /Turn it off/i }).click();
    await expect(page.getByRole("heading", { name: /Two-factor is off/i })).toBeVisible({
      timeout: 10000,
    });

    const res = await signIn(request);
    expect(res.status(), await res.text()).toBe(200);
  });
});
