import { type APIRequestContext, expect, test } from "@playwright/test";

import { DEALER_B_SLUG, FIXTURE_PASSWORD, FIXTURES } from "../src/seed/fixture-accounts";

/**
 * The adversarial suite.
 *
 * Everything else in this repository proves that the access control is written correctly.
 * This proves it works, which is a different claim: it authenticates as a real dealer over
 * real HTTP and tries, by every route the REST API offers, to read and write another
 * dealership's data.
 *
 * Three rules it follows, and each one exists because the obvious version of this test
 * passes while proving nothing.
 *
 * 1. **It goes over HTTP, not through the local API.** The local API can be called with
 *    `overrideAccess` and defaults differently. A test that calls `payload.find` is testing
 *    a function, not the thing an attacker can reach.
 *
 * 2. **A refused write is checked twice.** An unhappy status code means the response was
 *    unhappy, not that nothing happened. Every write attempt is followed by a read as a
 *    platform admin, asserting the row is unchanged. That second read is the actual test.
 *
 * 3. **Nothing here skips when the fixtures are missing.** It fails and says how to create
 *    them. A security test that quietly skips itself is worse than no test, because the
 *    summary still says green.
 *
 * Run `npm run seed && npm run seed:fixtures` before this, which is what CI does.
 */

/**
 * One worker, in order.
 *
 * `fullyParallel` otherwise splits this file across workers, each running its own beforeAll,
 * so five accounts get signed in several times at once and the escalation tests mutate the
 * very user the other tests authenticate as. Mode "default" keeps the file on one worker in
 * declaration order.
 *
 * Deliberately not "serial": serial skips every remaining test after a failure, and a
 * security suite that stops reporting at the first problem hides the rest of them.
 */
test.describe.configure({ mode: "default" });

/** Seventeen characters, no I, O or Q, so they read as real VINs rather than placeholders. */
const VIN_A = "AAVZZZ1KZAU000001";
const VIN_B = "AAVZZZ1KZAU000002";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rynet.co.za";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

type Session = { token: string; id: number };

/**
 * Resolved once in beforeAll rather than per test. The Users collection locks an account
 * after eight failed attempts, and logging in five identities on every one of twenty tests
 * is a good way to discover that limit the hard way.
 */
let admin: Session;
let ownerA: Session;
let salesA: Session;
let ownerB: Session;
let buyer: Session;

let dealerAId: number;
let dealerBId: number;
let leadAId: number;
let leadBId: number;
let vehicleAId: number;
let vehicleBId: number;

async function login(
  request: APIRequestContext,
  collection: "users" | "buyers",
  email: string,
  password: string,
): Promise<Session> {
  const res = await request.post(`/api/${collection}/login`, { data: { email, password } });

  if (!res.ok()) {
    throw new Error(
      [
        `Could not sign in as ${email} (HTTP ${res.status()}).`,
        "",
        "The isolation suite needs its fixture accounts. Create them with:",
        "  npm run seed && npm run seed:fixtures",
        "",
        "This suite does not skip when they are missing, deliberately. A security test that",
        "skips itself still reports green.",
      ].join("\n"),
    );
  }

  const body = await res.json();
  return { token: body.token, id: body.user.id };
}

/** Payload's REST auth header. Cookies work too; a bearer token is what a script would use. */
const as = (session: Session) => ({ headers: { Authorization: `JWT ${session.token}` } });

const idOf = (value: unknown): number =>
  typeof value === "object" && value !== null ? (value as { id: number }).id : (value as number);

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });

  admin = await login(request, "users", ADMIN_EMAIL, ADMIN_PASSWORD);
  ownerA = await login(request, "users", FIXTURES.ownerA, FIXTURE_PASSWORD);
  salesA = await login(request, "users", FIXTURES.salesA, FIXTURE_PASSWORD);
  ownerB = await login(request, "users", FIXTURES.ownerB, FIXTURE_PASSWORD);
  buyer = await login(request, "buyers", FIXTURES.buyer, FIXTURE_PASSWORD);

  const meA = await (await request.get("/api/users/me", as(ownerA))).json();
  const meB = await (await request.get("/api/users/me", as(ownerB))).json();
  dealerAId = idOf(meA.user.dealer);
  dealerBId = idOf(meB.user.dealer);
  expect(dealerAId, "the two fixture dealerships must differ").not.toBe(dealerBId);

  // Everything below is looked up as the platform admin, because the entire point of the
  // suite is that dealer A cannot look dealer B's identifiers up for itself.
  const leads = await (await request.get("/api/leads?limit=500&depth=0", as(admin))).json();
  leadAId = leads.docs.find((d: { name: string }) => d.name === FIXTURES.leadNameA)?.id;
  leadBId = leads.docs.find((d: { name: string }) => d.name === FIXTURES.leadNameB)?.id;
  expect(leadAId, "fixture lead A is missing, run npm run seed:fixtures").toBeTruthy();
  expect(leadBId, "fixture lead B is missing, run npm run seed:fixtures").toBeTruthy();

  const stockOf = async (dealer: number) => {
    const res = await request.get(
      `/api/vehicles?where[dealer][equals]=${dealer}&limit=1&depth=0`,
      as(admin),
    );
    return (await res.json()).docs[0]?.id as number;
  };
  vehicleAId = await stockOf(dealerAId);
  vehicleBId = await stockOf(dealerBId);
  expect(vehicleAId, "dealer A has no stock to test against").toBeTruthy();
  expect(vehicleBId, "dealer B has no stock to test against").toBeTruthy();

  // The seed leaves VINs empty, so the original "no VIN in a public response" test was
  // passing against a column that held nothing. Planted here, as the admin, so every VIN
  // assertion below is made against a row that actually has one.
  for (const [id, vin] of [
    [vehicleAId, VIN_A],
    [vehicleBId, VIN_B],
  ] as const) {
    const res = await request.patch(`/api/vehicles/${id}`, { ...as(admin), data: { vin } });
    expect(res.status(), `could not plant a VIN on vehicle ${id}`).toBe(200);
  }

  await request.dispose();
});

// ---------------------------------------------------------------------------------------
// The core claim: a dealership cannot reach another dealership's leads.
// ---------------------------------------------------------------------------------------

test.describe("dealer A against dealer B's leads", () => {
  test("listing leads returns only its own", async ({ request }) => {
    const res = await request.get("/api/leads?limit=500&depth=0", as(ownerA));
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.docs.length, "dealer A should see at least its own fixture lead").toBeGreaterThan(
      0,
    );

    for (const lead of body.docs) {
      expect(idOf(lead.dealer), `lead ${lead.id} belongs to another dealership`).toBe(dealerAId);
    }
    expect(body.docs.map((d: { id: number }) => d.id)).not.toContain(leadBId);
  });

  test("asking for dealer B's leads by name returns nothing", async ({ request }) => {
    // The obvious attack: stop relying on the default scope and name the target outright.
    const res = await request.get(
      `/api/leads?where[dealer][equals]=${dealerBId}&limit=500&depth=0`,
      as(ownerA),
    );
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.docs, "a where clause naming dealer B must not widen the scope").toEqual([]);
    expect(body.totalDocs).toBe(0);
  });

  test("fetching dealer B's lead by id does not return it", async ({ request }) => {
    const res = await request.get(`/api/leads/${leadBId}?depth=0`, as(ownerA));
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    // And the refusal must not leak the row through the error body either.
    expect(await res.text()).not.toContain(FIXTURES.leadNameB);
  });

  test("updating dealer B's lead changes nothing", async ({ request }) => {
    const res = await request.patch(`/api/leads/${leadBId}`, {
      ...as(ownerA),
      data: { status: "lost", name: "Owned by dealer A" },
    });
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    // The status code is not the test. This is.
    const after = await (await request.get(`/api/leads/${leadBId}?depth=0`, as(admin))).json();
    expect(after.name).toBe(FIXTURES.leadNameB);
    expect(after.status).toBe("new");
    expect(idOf(after.dealer)).toBe(dealerBId);
  });

  test("a sales agent sees its own dealership's leads and no others", async ({ request }) => {
    const res = await request.get("/api/leads?limit=500&depth=0", as(salesA));
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const lead of body.docs) expect(idOf(lead.dealer)).toBe(dealerAId);
    expect(body.docs.map((d: { id: number }) => d.id)).not.toContain(leadBId);
  });

  test("nobody deletes a lead, including a platform admin", async ({ request }) => {
    // A lead carries a POPIA retention obligation and a consent record that points at it.
    // Removal happens through the scheduled purge, not a button next to an awkward row.
    for (const [who, session] of [
      ["dealer A on its own lead", ownerA],
      ["a platform admin", admin],
    ] as const) {
      const res = await request.delete(`/api/leads/${leadAId}`, as(session));
      expect([403, 404], `${who} should not be able to delete a lead`).toContain(res.status());
    }

    const after = await request.get(`/api/leads/${leadAId}?depth=0`, as(admin));
    expect(after.status(), "the lead must still exist").toBe(200);
  });
});

// ---------------------------------------------------------------------------------------
// The other half: a dealership cannot write into another dealership's stock.
// ---------------------------------------------------------------------------------------

test.describe("dealer A against dealer B's stock", () => {
  test("updating dealer B's vehicle changes nothing", async ({ request }) => {
    const before = await (
      await request.get(`/api/vehicles/${vehicleBId}?depth=0`, as(admin))
    ).json();

    const res = await request.patch(`/api/vehicles/${vehicleBId}`, {
      ...as(ownerA),
      data: { price: 1, status: "draft" },
    });
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    const after = await (
      await request.get(`/api/vehicles/${vehicleBId}?depth=0`, as(admin))
    ).json();
    expect(after.price).toBe(before.price);
    expect(after.status).toBe(before.status);
    expect(idOf(after.dealer)).toBe(dealerBId);
  });

  test("deleting dealer B's vehicle changes nothing", async ({ request }) => {
    const res = await request.delete(`/api/vehicles/${vehicleBId}`, as(ownerA));
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    const after = await request.get(`/api/vehicles/${vehicleBId}?depth=0`, as(admin));
    expect(after.status(), "dealer B's vehicle must still exist").toBe(200);
  });

  test("reassigning its own vehicle to dealer B is silently corrected", async ({ request }) => {
    // Aimed at the beforeValidate hook, which overwrites the dealer rather than validating
    // it. The request succeeds; the field it tried to change did not move.
    const res = await request.patch(`/api/vehicles/${vehicleAId}`, {
      ...as(ownerA),
      data: { dealer: dealerBId },
    });
    expect(res.status(), "the update itself is legitimate, only the dealer field is not").toBe(200);

    const after = await (
      await request.get(`/api/vehicles/${vehicleAId}?depth=0`, as(admin))
    ).json();
    expect(idOf(after.dealer), "stock must not be able to walk between dealerships").toBe(
      dealerAId,
    );
  });

  /**
   * Found by extending the anonymous VIN test to an authenticated dealership.
   *
   * The field read was `isDealerStaff`, which is true for every dealer account on the
   * platform, and every dealership can read every live listing. So any dealership could ask
   * for a competitor's stock and get the VINs with it. The public path was closed the whole
   * time, which is exactly why the anonymous test passed while this was wide open.
   *
   * A VIN is what you need to clone a car's identity or put a finance application on one.
   */
  test("dealer A cannot read the VIN on dealer B's stock", async ({ request }) => {
    const res = await request.get(`/api/vehicles/${vehicleBId}?depth=0`, as(ownerA));
    expect(res.status(), "dealer A can read the listing itself, which is correct").toBe(200);

    const body = await res.text();
    expect(body, "a competitor's VIN was returned").not.toContain(VIN_B);

    // And in bulk, which is how it would actually be harvested.
    const list = await request.get(
      `/api/vehicles?where[dealer][equals]=${dealerBId}&limit=50&depth=0`,
      as(ownerA),
    );
    expect(await list.text(), "a competitor's VIN was returned in a list").not.toContain(VIN_B);
  });

  test("dealer A can read the VIN on its own stock", async ({ request }) => {
    // The other half. A rule that hides the field from everyone is not access control, it
    // is a deletion, and the owning dealership genuinely needs this.
    const res = await request.get(`/api/vehicles/${vehicleAId}?depth=0`, as(ownerA));
    expect(res.status()).toBe(200);

    const doc = await res.json();
    expect(doc.vin, "a dealership cannot see the VIN on its own listing").toBe(VIN_A);
  });

  test("creating a vehicle under dealer B creates it under dealer A", async ({ request }) => {
    // Built from a real listing so the payload passes validation. That matters: a 400 from a
    // missing required field would look like a refusal and would prove nothing.
    const template = await (
      await request.get(`/api/vehicles/${vehicleAId}?depth=0`, as(admin))
    ).json();

    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      publicRef: _publicRef,
      _status: _draftStatus,
      ...fields
    } = template;

    const res = await request.post("/api/vehicles", {
      ...as(ownerA),
      data: {
        ...fields,
        dealer: dealerBId,
        stockNumber: `ISO-${Date.now()}`,
        status: "draft",
      },
    });

    expect(res.status(), await res.text()).toBe(201);
    const created = await res.json();
    expect(idOf(created.doc.dealer), "a listing is born owned by its author's dealership").toBe(
      dealerAId,
    );

    await request.delete(`/api/vehicles/${created.doc.id}`, as(admin));
  });
});

// ---------------------------------------------------------------------------------------
// A buyer is not a seller, and there is no path between them.
// ---------------------------------------------------------------------------------------

test.describe("a buyer cannot become a seller", () => {
  test("a buyer cannot create a listing", async ({ request }) => {
    const res = await request.post("/api/vehicles", {
      ...as(buyer),
      data: { title: "Private sale, 2019 Polo", price: 189900, status: "live" },
    });

    // 403 specifically. A 400 would mean it got as far as validating the body, which would
    // mean access control had already let a consumer account through.
    expect(res.status(), "a buyer reached the create operation").toBe(403);
  });

  test("a buyer cannot read leads, staff, or the consent register", async ({ request }) => {
    for (const path of ["/api/leads", "/api/users", "/api/consent-records"]) {
      const res = await request.get(`${path}?limit=100`, as(buyer));
      expect(res.status(), `${path} was readable by a buyer`).toBe(403);
    }
  });

  test("a buyer sees only their own record", async ({ request }) => {
    const res = await request.get("/api/buyers?limit=100&depth=0", as(buyer));

    if (res.status() === 200) {
      const body = await res.json();
      for (const doc of body.docs) {
        expect(doc.id, "a buyer must only ever see their own record").toBe(buyer.id);
      }
    } else {
      expect(res.status()).toBe(403);
    }
  });

  test("a buyer cannot grow a role or a dealership", async ({ request }) => {
    // There is nothing to escalate: the collection has no role field and no dealer field.
    // Sending them anyway proves the schema drops them rather than quietly storing them.
    const res = await request.patch(`/api/buyers/${buyer.id}`, {
      ...as(buyer),
      data: { role: "platform_admin", dealer: dealerAId, name: "Fixture Buyer" },
    });
    expect([200, 400]).toContain(res.status());

    const after = await (await request.get(`/api/buyers/${buyer.id}?depth=0`, as(admin))).json();
    expect(after.role, "a buyer document must have no role at all").toBeUndefined();
    expect(after.dealer, "a buyer document must have no dealership at all").toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------
// Staff cannot promote themselves or plant colleagues elsewhere.
// ---------------------------------------------------------------------------------------

test.describe("privilege escalation", () => {
  test("a dealer owner cannot make itself a platform admin", async ({ request }) => {
    const res = await request.patch(`/api/users/${ownerA.id}`, {
      ...as(ownerA),
      data: { role: "platform_admin" },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/users/${ownerA.id}?depth=0`, as(admin))).json();
    expect(after.role, "the role clamp did not hold").toBe("dealer_owner");
  });

  test("a dealer owner cannot move itself to another dealership", async ({ request }) => {
    const res = await request.patch(`/api/users/${ownerA.id}`, {
      ...as(ownerA),
      data: { dealer: dealerBId },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/users/${ownerA.id}?depth=0`, as(admin))).json();
    expect(idOf(after.dealer), "a user must not walk into another dealership").toBe(dealerAId);
  });

  test("a dealer owner cannot plant a colleague inside dealer B", async ({ request }) => {
    const email = `planted-${Date.now()}@rynet.test`;
    const res = await request.post("/api/users", {
      ...as(ownerA),
      data: {
        email,
        password: FIXTURE_PASSWORD,
        name: "Planted",
        role: "platform_admin",
        dealer: dealerBId,
      },
    });

    if (res.status() === 201) {
      const created = await res.json();
      const after = await (
        await request.get(`/api/users/${created.doc.id}?depth=0`, as(admin))
      ).json();
      expect(idOf(after.dealer), "a new user landed in another dealership").toBe(dealerAId);
      expect(after.role, "a dealership minted a platform role").toBe("dealer_sales");
      await request.delete(`/api/users/${created.doc.id}`, as(admin));
    } else {
      expect([400, 403]).toContain(res.status());
    }
  });

  /**
   * Found by this suite rather than reasoned about in advance.
   *
   * Everything above tests the boundary between two dealerships. These four test the
   * boundary inside one, which did not exist: any dealer role could write the role field on
   * any colleague, so a sales agent could make itself principal and demote the real one on
   * the way past. It never crossed a dealership boundary, which is why every scoping test
   * passed while it was true.
   */
  test("a sales agent cannot promote itself to dealer principal", async ({ request }) => {
    const res = await request.patch(`/api/users/${salesA.id}`, {
      ...as(salesA),
      data: { role: "dealer_owner" },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/users/${salesA.id}?depth=0`, as(admin))).json();
    expect(after.role, "a sales agent promoted itself").toBe("dealer_sales");
  });

  test("a sales agent cannot demote the dealer principal", async ({ request }) => {
    const res = await request.patch(`/api/users/${ownerA.id}`, {
      ...as(salesA),
      data: { role: "dealer_sales" },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/users/${ownerA.id}?depth=0`, as(admin))).json();
    expect(after.role, "a sales agent demoted the dealer principal").toBe("dealer_owner");
  });

  test("a sales agent cannot change the principal's email address", async ({ request }) => {
    // The takeover route: change the address, then use the password reset that lands on it.
    const res = await request.patch(`/api/users/${ownerA.id}`, {
      ...as(salesA),
      data: { email: "captured@rynet.test" },
    });
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    const after = await (await request.get(`/api/users/${ownerA.id}?depth=0`, as(admin))).json();
    expect(after.email, "a colleague's sign-in address was rewritten").toBe(FIXTURES.ownerA);
  });

  test("a sales agent cannot invite a colleague", async ({ request }) => {
    const res = await request.post("/api/users", {
      ...as(salesA),
      data: {
        email: `invited-by-sales-${Date.now()}@rynet.test`,
        password: FIXTURE_PASSWORD,
        name: "Invited by a sales agent",
        role: "dealer_sales",
      },
    });
    expect(res.status(), "a sales agent minted an account").toBe(403);
  });

  test("a dealer owner sees only its own dealership's team", async ({ request }) => {
    const res = await request.get("/api/users?limit=500&depth=0", as(ownerA));
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.docs.length).toBeGreaterThan(0);
    for (const user of body.docs) {
      expect(idOf(user.dealer), `${user.email} belongs to another dealership`).toBe(dealerAId);
    }
    const emails = body.docs.map((d: { email: string }) => d.email);
    expect(emails).not.toContain(FIXTURES.ownerB);
    expect(emails).not.toContain(ADMIN_EMAIL);
  });
});

// ---------------------------------------------------------------------------------------
// A dealership cannot write Rynet's own assessment of it.
// ---------------------------------------------------------------------------------------

test.describe("a dealership cannot award itself trust", () => {
  test("it cannot verify itself", async ({ request }) => {
    const res = await request.patch(`/api/dealers/${dealerAId}`, {
      ...as(ownerA),
      data: { verificationStatus: "verified", legalName: "Highveld Motor Group (Pty) Ltd" },
    });
    expect([200, 400, 403]).toContain(res.status());

    // Verified already, so the meaningful half is the reverse: a suspension must stick.
    await request.patch(`/api/dealers/${dealerBId}`, {
      ...as(admin),
      data: { verificationStatus: "suspended" },
    });
    const selfLift = await request.patch(`/api/dealers/${dealerBId}`, {
      ...as(ownerB),
      data: { verificationStatus: "verified" },
    });
    expect([200, 400, 403]).toContain(selfLift.status());

    const after = await (await request.get(`/api/dealers/${dealerBId}?depth=0`, as(admin))).json();
    expect(after.verificationStatus, "a dealership lifted its own suspension").toBe("suspended");

    await request.patch(`/api/dealers/${dealerBId}`, {
      ...as(admin),
      data: { verificationStatus: "verified" },
    });
  });

  test("it cannot award itself a rating it has not collected", async ({ request }) => {
    const before = await (await request.get(`/api/dealers/${dealerAId}?depth=0`, as(admin))).json();

    const res = await request.patch(`/api/dealers/${dealerAId}`, {
      ...as(ownerA),
      data: { reviewScore: 5, reviewCount: 412, listingCount: 9999 },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/dealers/${dealerAId}?depth=0`, as(admin))).json();
    expect(after.reviewScore, "a dealership wrote its own rating").toBe(before.reviewScore ?? null);
    expect(after.reviewCount, "a dealership wrote its own review count").toBe(before.reviewCount);
    expect(after.listingCount, "a dealership wrote its own stock count").toBe(before.listingCount);
  });

  test("it cannot claim an accreditation nobody has checked", async ({ request }) => {
    // /how-verification-works tells the public that where a dealership displays RMI, NADA,
    // MIWA or SAMBRA membership, we have seen the certificate. This is that sentence.
    const before = await (await request.get(`/api/dealers/${dealerBId}?depth=0`, as(admin))).json();

    const accreditations = await (await request.get("/api/accreditations?limit=5&depth=0")).json();
    const claim = accreditations.docs.map((a: { id: number }) => a.id);
    expect(claim.length, "no accreditations are seeded to attempt a claim with").toBeGreaterThan(0);

    const res = await request.patch(`/api/dealers/${dealerBId}`, {
      ...as(ownerB),
      data: { accreditations: claim },
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await (await request.get(`/api/dealers/${dealerBId}?depth=0`, as(admin))).json();
    expect(after.accreditations ?? [], "a dealership awarded itself a trust badge").toEqual(
      before.accreditations ?? [],
    );
  });

  test("it cannot edit another dealership at all", async ({ request }) => {
    const res = await request.patch(`/api/dealers/${dealerBId}`, {
      ...as(ownerA),
      data: { tradingName: "Owned by dealer A" },
    });
    expect([403, 404], `expected a refusal, got ${res.status()}`).toContain(res.status());

    const after = await (await request.get(`/api/dealers/${dealerBId}?depth=0`, as(admin))).json();
    expect(after.tradingName).not.toBe("Owned by dealer A");
  });
});

// ---------------------------------------------------------------------------------------
// Consent records are evidence, and evidence that can be edited is not evidence.
// ---------------------------------------------------------------------------------------

test.describe("consent records are append only", () => {
  test("a dealership cannot read them at all", async ({ request }) => {
    const res = await request.get("/api/consent-records?limit=100", as(ownerA));
    expect(res.status(), "a dealership read the consent register").toBe(403);
  });

  test("not even a platform admin can edit or delete one", async ({ request }) => {
    const list = await (
      await request.get("/api/consent-records?limit=1&depth=0", as(admin))
    ).json();
    const record = list.docs[0];
    expect(record, "no consent record exists; run the enquiry suite first").toBeTruthy();

    const patched = await request.patch(`/api/consent-records/${record.id}`, {
      ...as(admin),
      data: { policyVersion: "rewritten-after-the-fact" },
    });
    expect([403, 404]).toContain(patched.status());

    const deleted = await request.delete(`/api/consent-records/${record.id}`, as(admin));
    expect([403, 404]).toContain(deleted.status());

    const after = await (
      await request.get(`/api/consent-records/${record.id}?depth=0`, as(admin))
    ).json();
    expect(after.policyVersion).toBe(record.policyVersion);
  });
});

// ---------------------------------------------------------------------------------------
// Anonymous. The baseline: what the internet reaches without an account.
// ---------------------------------------------------------------------------------------

test.describe("anonymous requests", () => {
  test("the private collections are closed", async ({ request }) => {
    for (const path of ["/api/leads", "/api/users", "/api/consent-records", "/api/buyers"]) {
      const res = await request.get(`${path}?limit=100`);
      expect(res.status(), `${path} was readable without an account`).toBe(403);
    }
  });

  test("a listing cannot be created without an account", async ({ request }) => {
    const res = await request.post("/api/vehicles", {
      data: { title: "Private sale, 2019 Polo", price: 189900, status: "live" },
    });
    expect(res.status()).toBe(403);
  });

  test("no VIN is returned by the public API", async ({ request }) => {
    const res = await request.get(`/api/vehicles/${vehicleAId}?depth=1`);
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body.toLowerCase(), "a VIN reached an anonymous response").not.toContain('"vin"');
    expect(body, "the VIN value reached an anonymous response").not.toContain(VIN_A);

    // And the list endpoint, which is the one that returns hundreds at a time.
    const list = await request.get("/api/vehicles?limit=50&depth=1");
    const listBody = await list.text();
    expect(listBody.toLowerCase()).not.toContain('"vin"');
    expect(listBody).not.toContain(VIN_A);
  });

  test("unverified dealerships are invisible", async ({ request }) => {
    const res = await request.get("/api/dealers?limit=500&depth=0");
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const dealer of body.docs) {
      expect(dealer.verificationStatus, `${dealer.slug} is not verified but is public`).toBe(
        "verified",
      );
    }
    expect(body.docs.map((d: { slug: string }) => d.slug)).toContain(DEALER_B_SLUG);
  });
});
