import { expect, test } from "@playwright/test";

import { adminCaller } from "./portal-helpers";

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

const SOURCE = "e2e-stock-import.test";

test.describe.configure({ mode: "default" });

test("a stock list cannot list the same car twice under one dealership", async ({ request }) => {
  // Signed in again whenever a parallel suite's admin sign-in has dropped this session.
  const call = adminCaller(request);

  // Built from a real listing, so the payload passes validation. A 400 from a missing required
  // field would look like a refusal and would prove nothing.
  const listing = await (
    await call((headers) => request.get("/api/vehicles?sort=id&limit=1&depth=0", { headers }))
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
    const first = await call((headers) => request.post("/api/vehicles", { headers, data: body }));
    expect(first.status(), await first.text()).toBe(201);
    created.push((await first.json()).doc.id as number);

    // The same dealership, the same stock list, the same listing on it. Refused.
    const second = await call((headers) => request.post("/api/vehicles", { headers, data: body }));
    expect(
      second.ok(),
      "a second car with the same dealership, source and reference was accepted",
    ).toBeFalsy();
    if (second.ok()) created.push((await second.json()).doc.id as number);

    // The read that is the actual test: one row, not two.
    const count = await (
      await call((headers) =>
        request.get(
          `/api/vehicles?where[source][equals]=${SOURCE}&where[externalId][equals]=${externalId}&limit=0&depth=0`,
          { headers },
        ),
      )
    ).json();
    expect(count.totalDocs, "the refused write still created a second car").toBe(1);

    // A different listing on the same stock list is a different car, and is allowed.
    const other = await call((headers) =>
      request.post("/api/vehicles", {
        headers,
        data: { ...body, externalId: `${externalId}-b` },
      }),
    );
    expect(other.status(), await other.text()).toBe(201);
    created.push((await other.json()).doc.id as number);
  } finally {
    for (const id of created) {
      await call((headers) => request.delete(`/api/vehicles/${id}`, { headers }));
    }
  }
});
