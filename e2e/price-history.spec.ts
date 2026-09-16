import { type APIRequestContext, type APIResponse, expect, test } from "@playwright/test";

/**
 * A car's previous price, and the "Reduced by" badge built from it, must come from the price the
 * site last showed, never from a half-typed price that autosave kept as a draft.
 *
 * The admin autosaves a car while it is being edited. Each autosave is a draft: it is written to
 * the car's history, not to the car the site reads. When the price history compared a new price
 * with the latest DRAFT, typing 2850000, pausing, and deleting a zero left the car saved at
 * R 285 000 with a previous price of R 2 850 000, and the site advertised a price drop that never
 * happened.
 *
 * Runs over the REST API as the admin, the way the admin's own autosave and Save changes do, on a
 * car it creates and deletes itself. HTTP only, so the phone project skips it (see the config).
 */

// One car, edited in order.
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

type Car = {
  id: number;
  price: number;
  previousPrice?: number | null;
  priceHistory?: { price: number }[] | null;
};

let token: string | null = null;
let carId: number | null = null;

async function signIn(request: APIRequestContext) {
  const res = await request.post("/api/users/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `could not sign in as ${ADMIN_EMAIL} (HTTP ${res.status()})`).toBe(true);
  token = ((await res.json()) as { token: string }).token;
}

/**
 * Sends a request as the admin, signing in again if the session was dropped.
 *
 * Every suite signs in as the same admin account, and two sign-ins that land together can each
 * write the account's session list without the other's entry, so one token stops working. That
 * is a property of the shared test account, not of the price history, so a refused request is
 * retried with a fresh session rather than reported as a failure.
 */
async function asAdmin(
  request: APIRequestContext,
  send: (headers: Record<string, string>) => Promise<APIResponse>,
): Promise<APIResponse> {
  let res: APIResponse | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!token || attempt > 0) await signIn(request);
    res = await send({ Authorization: `JWT ${token}` });
    if (res.status() !== 401 && res.status() !== 403) return res;
  }
  return res as APIResponse;
}

const read = async (request: APIRequestContext): Promise<Car> =>
  (await (
    await asAdmin(request, (headers) => request.get(`/api/vehicles/${carId}?depth=0`, { headers }))
  ).json()) as Car;

const autosave = (request: APIRequestContext, price: number) =>
  asAdmin(request, (headers) =>
    request.patch(`/api/vehicles/${carId}?draft=true&autosave=true&depth=0`, {
      headers,
      data: { price },
    }),
  );

const save = (request: APIRequestContext, price: number) =>
  asAdmin(request, (headers) =>
    request.patch(`/api/vehicles/${carId}?depth=0`, {
      headers,
      data: { price, _status: "published" },
    }),
  );

test.beforeAll(async ({ request }) => {
  const found = await asAdmin(request, (headers) =>
    request.get("/api/vehicles?where[status][equals]=live&limit=1&depth=0&sort=id", { headers }),
  );
  const template = ((await found.json()) as { docs: Record<string, unknown>[] }).docs[0];
  expect(template, "a live car to copy").toBeTruthy();
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    publicRef: _publicRef,
    title: _title,
    ...fields
  } = template as Record<string, unknown>;

  const created = await asAdmin(request, (headers) =>
    request.post("/api/vehicles", {
      headers,
      data: {
        ...fields,
        _status: "published",
        gallery: ((fields.gallery as { id?: unknown }[] | undefined) ?? []).map(
          ({ id: _rowId, ...row }) => row,
        ),
        price: 300000,
        previousPrice: null,
        priceHistory: [],
        stockNumber: `PRICE-${Date.now()}`,
      },
    }),
  );
  expect(created.status(), await created.text()).toBe(201);
  carId = ((await created.json()) as { doc: Car }).doc.id;
});

test.afterAll(async ({ request }) => {
  if (carId === null) return;
  await asAdmin(request, (headers) => request.delete(`/api/vehicles/${carId}`, { headers }));
});

test("half-typed prices kept by autosave never become the previous price", async ({ request }) => {
  // Typing 2850000, pausing, then deleting a zero: two autosaves.
  expect((await autosave(request, 2850000)).ok()).toBe(true);
  expect((await autosave(request, 285000)).ok()).toBe(true);

  // The site still shows the saved price while the edits are only drafts.
  const beforeSave = await read(request);
  expect(beforeSave.price).toBe(300000);
  expect(beforeSave.previousPrice ?? null).toBeNull();

  const saved = await save(request, 285000);
  expect(saved.ok(), await saved.text()).toBe(true);

  const car = await read(request);
  expect(car.price).toBe(285000);
  expect(car.previousPrice, "the previous price is the price the site showed").toBe(300000);
  expect(
    (car.priceHistory ?? []).map((entry) => entry.price),
    "one change, recorded once",
  ).toEqual([285000]);
});

test("saving without a price change leaves the history alone", async ({ request }) => {
  expect((await autosave(request, 999999)).ok()).toBe(true);
  const saved = await save(request, 285000);
  expect(saved.ok(), await saved.text()).toBe(true);

  const car = await read(request);
  expect(car.price).toBe(285000);
  expect(car.previousPrice).toBe(300000);
  expect((car.priceHistory ?? []).map((entry) => entry.price)).toEqual([285000]);
});
