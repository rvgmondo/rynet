import { type APIRequestContext, expect, test } from "@playwright/test";

/**
 * One car per dealership per listing on the stock list it came from.
 *
 * This is the guarantee that makes a repeatable import possible. Without it, the second run of
 * any stock import lists every car a second time, and the third run lists them all again, and a
 * marketplace that promises verified dealers is showing the same Polo four times under one of
 * them. The rule is enforced by a unique index on (dealer, source, externalId), declared on the
 * drizzle table in payload.config.ts and created by the migration, so it holds however the write
 * arrives: through the admin, through the REST API, or through the importer.
 *
 * Asserted over HTTP against a real build, and asserted twice: an unhappy status code means the
 * response was unhappy, not that nothing was written, so the count is read back afterwards.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

const SOURCE = "e2e-stock-import.test";

type Session = { token: string };

async function signIn(request: APIRequestContext): Promise<Session> {
  const res = await request.post("/api/users/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(
    res.ok(),
    `could not sign in as ${ADMIN_EMAIL}. Run npm run seed:admin first.`,
  ).toBeTruthy();
  const body = await res.json();
  return { token: body.token as string };
}

const as = (session: Session) => ({ headers: { Authorization: `JWT ${session.token}` } });

test.describe.configure({ mode: "default" });

test("a stock list cannot list the same car twice under one dealership", async ({ request }) => {
  const admin = await signIn(request);

  // Built from a real listing, so the payload passes validation. A 400 from a missing required
  // field would look like a refusal and would prove nothing.
  const listing = await (
    await request.get("/api/vehicles?sort=id&limit=1&depth=0", as(admin))
  ).json();
  const template = listing.docs[0];
  expect(template, "there is no stock to build the test payload from").toBeTruthy();

  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    publicRef: _publicRef,
    _status: _draftStatus,
    gallery: _gallery,
    ...fields
  } = template;

  const externalId = `dup-${Date.now()}`;
  const body = {
    ...fields,
    gallery: [],
    status: "draft",
    source: SOURCE,
    externalId,
    sourceManaged: true,
  };

  const created: number[] = [];
  try {
    const first = await request.post("/api/vehicles", { ...as(admin), data: body });
    expect(first.status(), await first.text()).toBe(201);
    created.push((await first.json()).doc.id as number);

    // The same dealership, the same stock list, the same listing on it. Refused.
    const second = await request.post("/api/vehicles", { ...as(admin), data: body });
    expect(
      second.ok(),
      "a second car with the same dealership, source and reference was accepted",
    ).toBeFalsy();
    if (second.ok()) created.push((await second.json()).doc.id as number);

    // The read that is the actual test: one row, not two.
    const count = await (
      await request.get(
        `/api/vehicles?where[source][equals]=${SOURCE}&where[externalId][equals]=${externalId}&limit=0&depth=0`,
        as(admin),
      )
    ).json();
    expect(count.totalDocs, "the refused write still created a second car").toBe(1);

    // A different listing on the same stock list is a different car, and is allowed.
    const other = await request.post("/api/vehicles", {
      ...as(admin),
      data: { ...body, externalId: `${externalId}-b` },
    });
    expect(other.status(), await other.text()).toBe(201);
    created.push((await other.json()).doc.id as number);
  } finally {
    for (const id of created) {
      await request.delete(`/api/vehicles/${id}`, as(admin));
    }
  }
});
