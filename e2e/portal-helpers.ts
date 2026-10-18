import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type APIResponse,
  type Browser,
  expect,
  type Page,
} from "@playwright/test";

import sharp from "sharp";

import { DEALER_A_SLUG } from "../src/seed/fixture-accounts";
import { renderEverything } from "./axe-context";
import { ADMIN_TOKEN_FILE } from "./global-setup";

/**
 * What the portal suites share: signing in as the admin, a car of dealer A's own, and a dealer A
 * login made the way the onboarding desk makes one and signed in to in a fresh browser.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

export const PORTAL_PASSWORD = "a long portal password";

export async function tokenFor(request: APIRequestContext, email: string, password: string) {
  const res = await request.post("/api/users/login", { data: { email, password } });
  expect(res.ok(), `could not sign in as ${email}, run npm run seed:fixtures`).toBe(true);
  return ((await res.json()) as { token: string }).token;
}

export const auth = (token: string) => ({ Authorization: `JWT ${token}` });

export type AdminCall = (
  send: (headers: Record<string, string>) => Promise<APIResponse>,
) => Promise<APIResponse>;

/**
 * Admin requests, signed in again when the shared admin session was dropped. Every suite signs in
 * as the same admin, and under a full parallel run a fresh token can be refused more than once.
 */
export function adminCaller(request: APIRequestContext): AdminCall {
  let token: string | null = sharedAdminToken();
  return async (send) => {
    token ??= await tokenFor(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    let response = await send(auth(token));
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (response.status() !== 401 && response.status() !== 403) return response;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      token = await tokenFor(request, ADMIN_EMAIL, ADMIN_PASSWORD);
      response = await send(auth(token));
    }
    return response;
  };
}

/** The token e2e/global-setup.ts made before any suite ran, when there is one. */
function sharedAdminToken(): string | null {
  try {
    return readFileSync(ADMIN_TOKEN_FILE, "utf8").trim() || null;
  } catch {
    return null;
  }
}

export async function expectNoAxeViolations(page: Page) {
  await renderEverything(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  for (const v of results.violations) {
    console.error(`\n${v.id} (${v.impact}): ${v.help}`);
    for (const node of v.nodes.slice(0, 3)) console.error(`  ${node.html.slice(0, 160)}`);
  }
  expect(results.violations).toEqual([]);
}

export async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function dealerAId(request: APIRequestContext): Promise<number> {
  const dealers = await request.get(
    `/api/dealers?where[slug][equals]=${DEALER_A_SLUG}&limit=1&depth=0`,
  );
  const id = ((await dealers.json()) as { docs: { id: number }[] }).docs[0]?.id;
  expect(id, "dealer A is missing, run npm run seed:fixtures").toBeTruthy();
  return id as number;
}

/**
 * A photograph uploaded as Rynet's own, for a test car. CI seeds no photographs, and the Ad studio
 * draws nothing for a car without one. A plain 1200 by 900 JPEG made on the spot.
 */
export async function makePhoto(request: APIRequestContext, call: AdminCall): Promise<number> {
  const buffer = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#5a6f86" },
  })
    .jpeg()
    .toBuffer();
  const res = await call((headers) =>
    request.post("/api/media", {
      headers,
      multipart: {
        file: { name: `portal-test-${Date.now()}.jpg`, mimeType: "image/jpeg", buffer },
        _payload: JSON.stringify({ alt: "Test photograph of a car" }),
      },
    }),
  );
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { doc: { id: number } }).doc.id;
}

/** A live car of dealer A's own, copied from any live listing so it passes validation. */
export async function makeCar(
  request: APIRequestContext,
  call: AdminCall,
  dealerId: number,
  photoId?: number,
): Promise<number> {
  const any = await request.get("/api/vehicles?where[status][equals]=live&limit=1&depth=0");
  const template = ((await any.json()) as { docs: Record<string, unknown>[] }).docs[0];
  expect(template, "no live car to copy, run npm run seed").toBeTruthy();
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    publicRef: _publicRef,
    _status: _draft,
    vin: _vin,
    source: _source,
    externalId: _externalId,
    sourceManaged: _managed,
    ...fields
  } = template as Record<string, unknown>;
  const made = await call((headers) =>
    request.post("/api/vehicles", {
      headers,
      data: {
        ...fields,
        gallery: photoId
          ? [{ image: photoId }]
          : ((fields.gallery as { id?: unknown; image?: unknown }[] | undefined) ?? [])
              // A row whose photograph has since been deleted would fail validation.
              .filter((row) => Boolean(row.image))
              .map(({ id: _rowId, ...row }) => row),
        dealer: dealerId,
        branch: null,
        stockNumber: `PORTAL-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        isDemonstration: false,
        status: "live",
      },
    }),
  );
  expect(made.status(), await made.text()).toBe(201);
  return ((await made.json()) as { doc: { id: number } }).doc.id;
}

/** A dealer A login, its password chosen from the invite link, signed in in its own browser. */
export async function signedInDealer(
  browser: Browser,
  request: APIRequestContext,
  call: AdminCall,
  dealerId: number,
  label: string,
): Promise<{ page: Page; email: string }> {
  const email = `${label}-${Date.now()}@rynet.test`.toLowerCase();
  const res = await call((headers) =>
    request.post("/api/onboard/login", {
      headers,
      data: { dealerId, name: "Sipho Dlamini", email },
    }),
  );
  expect(res.ok(), await res.text()).toBe(true);
  const { path } = (await res.json()) as { path: string };

  const page = await (await browser.newContext()).newPage();
  await page.goto(path);
  await page.getByLabel("New password").fill(PORTAL_PASSWORD);
  await page.getByLabel("The same again").fill(PORTAL_PASSWORD);
  await page.getByRole("button", { name: "Save and sign in" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  return { page, email };
}

export async function deleteUserByEmail(
  request: APIRequestContext,
  call: AdminCall,
  email: string,
) {
  const found = await call((headers) =>
    request.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`, {
      headers,
    }),
  );
  const id = ((await found.json()) as { docs: { id: number }[] }).docs[0]?.id;
  if (id) await call((headers) => request.delete(`/api/users/${id}`, { headers }));
}
