import config from "@payload-config";
import { getPayload } from "payload";

import { MAX_DEALERSHIPS } from "@/lib/sell-to-dealer-schema";
import { type MatchableDealer, selectDealerships } from "@/lib/trade-in-matching";

/**
 * Sends trade-in leads to the dealerships that agreed to receive them.
 *
 * This is the code behind a sentence on a public page and in a stored consent record:
 * "verified dealerships in my province that buy this kind of vehicle ... no more than five".
 * Until this ran, that sentence was a promise with nothing behind it.
 *
 * Deliberately a job rather than something the submit action does inline:
 *
 * **The seller should not wait for it.** Matching reads every verified dealership and their
 * branches. Doing that inside the request would make the form slow for the one person who
 * gains nothing from it.
 *
 * **It has to be safely repeatable.** A submit that half-distributes and then throws would
 * leave a lead nobody can reason about. This is idempotent: a lead that already has
 * disclosures is skipped, so running it twice sends nothing twice.
 *
 * **Nobody is emailed yet, and the code says so rather than pretending.** SMTP is not
 * configured, so the dealership sees the lead when it next looks. Notification goes in here
 * when there is a mailbox to send from.
 *
 * Run it from cron on the host every fifteen minutes, next to the deploy job. The crontab
 * line is in DEPLOY-GIT.md, not here: a cron expression contains the characters that end a
 * block comment, which is a genuinely stupid way to break a build and it did.
 */

const RECENT_WINDOW_DAYS = 30;

type Summary = {
  considered: number;
  distributed: number;
  unplaced: number;
};

export async function distributeTradeIns({ dryRun = false } = {}): Promise<Summary> {
  const payload = await getPayload({ config });
  const log = (message: string) => process.stdout.write(`${message}\n`);

  // Only leads nobody has been told about yet. `disclosedTo` is the derived index, so an
  // empty one means this lead has never been sent anywhere.
  const pending = await payload.find({
    collection: "leads",
    where: {
      and: [{ type: { equals: "trade_in" } }, { disclosedTo: { exists: false } }],
    },
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  if (pending.docs.length === 0) {
    log("No trade-in leads waiting to be distributed.");
    return { considered: 0, distributed: 0, unplaced: 0 };
  }

  // Every dealership that has asked for trade-ins, with the provinces it has a branch in.
  const dealers = await payload.find({
    collection: "dealers",
    where: {
      and: [{ verificationStatus: { equals: "verified" } }, { acceptsTradeIns: { equals: true } }],
    },
    limit: 500,
    depth: 2,
    overrideAccess: true,
  });

  const branches = await payload.find({
    collection: "branches",
    limit: 2000,
    depth: 1,
    overrideAccess: true,
  });

  const provincesOf = new Map<number, string[]>();
  for (const branch of branches.docs) {
    const dealerId = typeof branch.dealer === "number" ? branch.dealer : branch.dealer?.id;
    const province = branch.province;
    const slug = typeof province === "object" && province ? province.slug : undefined;
    if (!dealerId || !slug) continue;
    provincesOf.set(dealerId, [...(provincesOf.get(dealerId) ?? []), slug]);
  }

  // How many each dealership has had lately, so the rotation is fair rather than alphabetical.
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const recent = await payload.find({
    collection: "leads",
    where: { and: [{ type: { equals: "trade_in" } }, { createdAt: { greater_than: since } }] },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  });

  const recentCount = new Map<number, number>();
  for (const lead of recent.docs) {
    for (const entry of lead.disclosedTo ?? []) {
      const id = typeof entry === "number" ? entry : entry?.id;
      if (id) recentCount.set(id, (recentCount.get(id) ?? 0) + 1);
    }
  }

  const matchable: MatchableDealer[] = dealers.docs.map((dealer) => ({
    id: dealer.id,
    tradingName: dealer.tradingName,
    verificationStatus: dealer.verificationStatus,
    acceptsTradeIns: dealer.acceptsTradeIns,
    buysMakes: (dealer.buysMakes ?? [])
      .filter((make): make is Exclude<typeof make, number> => typeof make === "object")
      .map((make) => ({ name: make.name, aliases: make.aliases ?? [] })),
    provinces: provincesOf.get(dealer.id) ?? [],
    recentDisclosures: recentCount.get(dealer.id) ?? 0,
  }));

  log(`${pending.docs.length} waiting, ${matchable.length} dealerships accepting trade-ins.`);

  let distributed = 0;
  let unplaced = 0;

  for (const lead of pending.docs) {
    const tradeIn = lead.tradeIn;
    const province = tradeIn?.province;
    const provinceSlug = typeof province === "object" && province ? province.slug : undefined;

    if (!tradeIn?.make || !provinceSlug) {
      log(`lead ${lead.id}: no make or province recorded, skipping`);
      unplaced += 1;
      continue;
    }

    const chosen = selectDealerships(
      matchable,
      { make: tradeIn.make, provinceSlug },
      MAX_DEALERSHIPS,
    );

    if (chosen.length === 0) {
      // Not a failure. The page tells the seller this can happen and promises we will say so,
      // which is a message somebody still has to send once there is a mailbox to send it from.
      log(`lead ${lead.id}: ${tradeIn.make} in ${provinceSlug}, nobody is buying that there`);
      unplaced += 1;
      continue;
    }

    log(
      `lead ${lead.id}: ${tradeIn.make} in ${provinceSlug} -> ${chosen.map((d) => d.tradingName).join(", ")}`,
    );

    // Counted before the early return, so a dry run reports what it would do rather than
    // printing a list of matches above a summary that says nothing happened.
    distributed += 1;
    if (dryRun) continue;

    const now = new Date().toISOString();
    await payload.update({
      collection: "leads",
      id: lead.id,
      overrideAccess: true,
      data: {
        disclosures: chosen.map((dealer) => ({ dealer: dealer.id, disclosedAt: now })),
      },
    });

    // Count it immediately, so a single run spreads leads across dealerships rather than
    // sending the same five every one of them.
    for (const dealer of chosen) {
      recentCount.set(dealer.id, (recentCount.get(dealer.id) ?? 0) + 1);
      const entry = matchable.find((m) => m.id === dealer.id);
      if (entry) entry.recentDisclosures = recentCount.get(dealer.id) ?? 0;
    }
  }

  log(
    dryRun
      ? `Dry run. ${distributed} would be distributed, ${unplaced} could not be placed.`
      : `Done. ${distributed} distributed, ${unplaced} could not be placed.`,
  );
  return { considered: pending.docs.length, distributed, unplaced };
}

// Run directly: `npx tsx src/jobs/distribute-trade-ins.ts [--dry-run]`
if (process.argv[1]?.includes("distribute-trade-ins")) {
  distributeTradeIns({ dryRun: process.argv.includes("--dry-run") })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
