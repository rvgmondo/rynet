/**
 * Fixtures for the adversarial isolation suite.
 *
 * These are accounts with known passwords. They exist so that `e2e/isolation.spec.ts` can
 * authenticate as a real dealer over real HTTP and try to read another dealer's leads,
 * which is the only way to prove the access control rather than assert it.
 *
 * Two safety properties, both deliberate:
 *
 * 1. **It refuses to run in production.** Not "warns", refuses. There is no legitimate
 *    reason for an account with a published password to exist on the live site, so the
 *    script exits non-zero rather than offering a flag to override. A flag would eventually
 *    get set.
 *
 * 2. **Every address is on `.test`**, which RFC 2606 reserves and no DNS will ever resolve.
 *    If one of these ever escapes into a mail queue it dead-ends instead of reaching a
 *    stranger who wondered why a car dealership emailed them.
 *
 * It is idempotent: run it twice and the second run reuses what the first created.
 *
 * Run with: npm run seed:fixtures
 */

import config from "@payload-config";
import { getPayload } from "payload";

import { DEALER_A_SLUG, DEALER_B_SLUG, FIXTURE_PASSWORD, FIXTURES } from "./fixture-accounts";

if (process.env.NODE_ENV === "production") {
  process.stderr.write(
    "Refusing to create test fixtures in production.\n" +
      "These accounts have a password that is written down in the repository.\n",
  );
  process.exit(1);
}

async function main() {
  const payload = await getPayload({ config });

  const dealerBySlug = async (slug: string) => {
    const found = await payload.find({
      collection: "dealers",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    const dealer = found.docs[0];
    if (!dealer) {
      throw new Error(
        `Dealership "${slug}" is not in the database. Run "npm run seed" before this script.`,
      );
    }
    return dealer;
  };

  const dealerA = await dealerBySlug(DEALER_A_SLUG);
  const dealerB = await dealerBySlug(DEALER_B_SLUG);

  const upsertUser = async (
    email: string,
    data: { name: string; role: "dealer_owner" | "dealer_sales"; dealer: number },
  ) => {
    const existing = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    });
    // Reconciled rather than skipped. An earlier run of the suite may have moved a role,
    // and a fixture that quietly inherits last run's damage turns a real regression into an
    // unreproducible one.
    if (existing.docs[0]) {
      const found = existing.docs[0];
      if (found.role !== data.role || Number(found.dealer) !== data.dealer) {
        return payload.update({ collection: "users", id: found.id, data });
      }
      return found;
    }

    return payload.create({
      collection: "users",
      data: { email, password: FIXTURE_PASSWORD, status: "active", ...data },
    });
  };

  await upsertUser(FIXTURES.ownerA, {
    name: "Fixture Owner A",
    role: "dealer_owner",
    dealer: dealerA.id,
  });
  await upsertUser(FIXTURES.salesA, {
    name: "Fixture Sales A",
    role: "dealer_sales",
    dealer: dealerA.id,
  });
  await upsertUser(FIXTURES.ownerB, {
    name: "Fixture Owner B",
    role: "dealer_owner",
    dealer: dealerB.id,
  });

  const existingBuyer = await payload.find({
    collection: "buyers",
    where: { email: { equals: FIXTURES.buyer } },
    limit: 1,
    depth: 0,
  });
  if (!existingBuyer.docs[0]) {
    await payload.create({
      collection: "buyers",
      data: {
        email: FIXTURES.buyer,
        password: FIXTURE_PASSWORD,
        name: "Fixture Buyer",
        status: "active",
        alertFrequency: "off",
      },
    });
  }

  // One lead per dealership. The test reads dealer A's, then goes looking for dealer B's by
  // every route the REST API offers: list, direct id, and a where clause naming B outright.
  const upsertLead = async (name: string, dealer: number) => {
    const existing = await payload.find({
      collection: "leads",
      where: { name: { equals: name } },
      limit: 1,
      depth: 0,
    });
    if (existing.docs[0]) return existing.docs[0];

    return payload.create({
      collection: "leads",
      data: {
        type: "enquiry",
        name,
        email: `${name.toLowerCase().replaceAll(" ", ".")}@rynet.test`,
        phone: "086 000 0000",
        message: "Fixture for the isolation suite. Not a real enquiry.",
        dealer,
        status: "new",
        isDemonstration: true,
      },
    });
  };

  const leadA = await upsertLead(FIXTURES.leadNameA, dealerA.id);
  const leadB = await upsertLead(FIXTURES.leadNameB, dealerB.id);

  process.stdout.write(
    [
      "Isolation fixtures ready.",
      `  Dealer A: ${dealerA.tradingName} (id ${dealerA.id}), lead ${leadA.id}`,
      `  Dealer B: ${dealerB.tradingName} (id ${dealerB.id}), lead ${leadB.id}`,
      `  Accounts: ${FIXTURES.ownerA}, ${FIXTURES.salesA}, ${FIXTURES.ownerB}, ${FIXTURES.buyer}`,
      "",
    ].join("\n"),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
