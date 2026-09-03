/**
 * Seed.
 *
 * Builds a complete, demonstrable Rynet: real South African taxonomy data, twelve
 * demonstration dealerships across six provinces, and roughly 300 vehicles priced and
 * mileaged the way the real market prices and mileages them.
 *
 * Two rules this script follows and the code should keep following:
 *
 * 1. **Deterministic.** The pseudo-random generator is seeded from a constant, so running
 *    the seed twice produces the same site. A demo that looks different every time it is
 *    rebuilt is impossible to review, and a screenshot in a document stops matching the
 *    thing it documents.
 *
 * 2. **Nothing is passed off as real.** Every dealership and every vehicle carries
 *    `isDemonstration: true`. Nothing here claims to be a business that exists, and no
 *    review scores or ratings are generated at all, because a fabricated rating on a
 *    trust-led platform is the worst possible thing to seed.
 *
 * Run with: npm run seed
 */

import config from "@payload-config";
import { type CollectionSlug, getPayload } from "payload";

import { DEALERS, PLANS } from "./data/dealers";
import {
  ACCREDITATIONS,
  BODY_TYPES,
  CITIES,
  COLOURS,
  DRIVETRAINS,
  FEATURE_CATEGORIES,
  FEATURES,
  FUEL_TYPES,
  PROVINCES,
  TRANSMISSIONS,
} from "./data/taxonomies";
import type { ModelSeed, VariantSeed } from "./data/vehicles";
import { MAKES } from "./data/vehicles";

type ModelOf = ModelSeed;
type VariantOf = VariantSeed;

// ---------------------------------------------------------------- deterministic randomness

/** mulberry32. Small, fast, and seeded, so every run of this script builds the same site. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260824);
const pick = <T>(items: readonly T[]): T => {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick called on an empty list");
  return item;
};
const between = (min: number, max: number) => min + rng() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rng() < p;

/**
 * Looks up a seeded id, and throws if it is missing.
 *
 * Every relationship below is required, so an undefined here means the taxonomy seed and
 * the vehicle seed have drifted apart. Failing on the spot with the missing name is far
 * more useful than creating 300 listings with holes in them.
 */
const must = (map: Map<string, number>, key: string, what: string): number => {
  const id = map.get(key);
  if (id === undefined) throw new Error(`seed: no ${what} found for "${key}"`);
  return id;
};

/** Rounds to the nearest R 100, the way a dealer actually prices a car. */
const roundPrice = (value: number) => Math.round(value / 100) * 100;

async function main() {
  const payload = await getPayload({ config });
  const log = (msg: string) => process.stdout.write(`${msg}\n`);

  log("Seeding Rynet");

  // ------------------------------------------------------------------ taxonomies
  const slugify = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  async function upsert(
    collection: string,
    name: string,
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const slug = slugify(name);
    const existing = await payload.find({
      collection: collection as CollectionSlug,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    const first = existing.docs[0];
    if (first) return first.id;
    const created = await payload.create({
      collection: collection as CollectionSlug,
      data: { name, slug, ...extra } as never,
    });
    return created.id;
  }

  const provinceIds = new Map<string, number>();
  for (const p of PROVINCES) {
    provinceIds.set(p.name, await upsert("provinces", p.name, { aliases: [...p.aliases] }));
  }
  log(`  provinces: ${provinceIds.size}`);

  const cityIds = new Map<string, number>();
  for (const c of CITIES) {
    cityIds.set(
      c.name,
      await upsert("cities", c.name, {
        province: provinceIds.get(c.province),
        latitude: c.latitude,
        longitude: c.longitude,
        aliases: "aliases" in c ? [...c.aliases] : [],
      }),
    );
  }
  log(`  cities: ${cityIds.size}`);

  const bodyIds = new Map<string, number>();
  for (const b of BODY_TYPES) {
    bodyIds.set(
      b.name,
      await upsert("body-types", b.name, { aliases: [...b.aliases], sortOrder: b.sortOrder }),
    );
  }

  const fuelIds = new Map<string, number>();
  for (const f of FUEL_TYPES) {
    fuelIds.set(
      f.name,
      await upsert("fuel-types", f.name, { aliases: [...f.aliases], sortOrder: f.sortOrder }),
    );
  }

  const transmissionIds = new Map<string, number>();
  for (const t of TRANSMISSIONS) {
    transmissionIds.set(
      t.name,
      await upsert("transmissions", t.name, { aliases: [...t.aliases], sortOrder: t.sortOrder }),
    );
  }

  const drivetrainIds = new Map<string, number>();
  for (const d of DRIVETRAINS) {
    drivetrainIds.set(
      d.name,
      await upsert("drivetrains", d.name, { aliases: [...d.aliases], sortOrder: d.sortOrder }),
    );
  }

  const colourIds = new Map<string, number>();
  for (const c of COLOURS) {
    colourIds.set(c.name, await upsert("colours", c.name, { family: c.family, swatch: c.swatch }));
  }
  log(
    `  body types ${bodyIds.size}, fuels ${fuelIds.size}, transmissions ${transmissionIds.size}, colours ${colourIds.size}`,
  );

  const featureCategoryIds = new Map<string, number>();
  for (const fc of FEATURE_CATEGORIES) {
    featureCategoryIds.set(
      fc.name,
      await upsert("feature-categories", fc.name, { sortOrder: fc.sortOrder }),
    );
  }

  const featureIds = new Map<string, number>();
  const featuresByCategory = new Map<string, number[]>();
  for (const f of FEATURES) {
    const id = await upsert("features", f.name, {
      category: featureCategoryIds.get(f.category),
      aliases: "aliases" in f ? [...f.aliases] : [],
      isHighlight: "isHighlight" in f ? f.isHighlight : false,
    });
    featureIds.set(f.name, id);
    const list = featuresByCategory.get(f.category) ?? [];
    list.push(id);
    featuresByCategory.set(f.category, list);
  }
  log(`  features: ${featureIds.size} across ${featureCategoryIds.size} categories`);

  const accreditationIds = new Map<string, number>();
  for (const a of ACCREDITATIONS) {
    accreditationIds.set(
      a.name,
      await upsert("accreditations", a.name, { aliases: [...a.aliases] }),
    );
  }

  // ------------------------------------------------------- makes, models, variants
  const makeIds = new Map<string, number>();
  const modelIds = new Map<string, number>();
  const variantIds = new Map<string, number>();
  const franchiseIds = new Map<string, number>();

  for (const make of MAKES) {
    const makeId = await upsert("makes", make.name, {
      isPopular: make.isPopular ?? false,
      aliases: make.aliases ? [...make.aliases] : [],
    });
    makeIds.set(make.name, makeId);
    franchiseIds.set(make.name, await upsert("franchises", make.name, { make: makeId }));

    for (const model of make.models) {
      const modelKey = `${make.name}|${model.name}`;
      const modelId = await upsert("models", model.name, {
        make: makeId,
        bodyType: bodyIds.get(model.body),
      });
      modelIds.set(modelKey, modelId);

      for (const variant of model.variants) {
        const variantId = await upsert("variants", variant.name, { model: modelId });
        variantIds.set(`${modelKey}|${variant.name}`, variantId);
      }
    }
  }
  log(`  makes ${makeIds.size}, models ${modelIds.size}, variants ${variantIds.size}`);

  // -------------------------------------------------------------------- plans
  const planIds = new Map<string, number>();
  for (const plan of PLANS) {
    const existing = await payload.find({
      collection: "plans",
      where: { slug: { equals: plan.slug } },
      limit: 1,
      depth: 0,
    });
    const first = existing.docs[0];
    if (first) {
      planIds.set(plan.slug, first.id);
      continue;
    }
    const created = await payload.create({
      collection: "plans",
      data: {
        name: plan.name,
        slug: plan.slug,
        monthlyPrice: plan.monthlyPrice,
        listingLimit: plan.listingLimit,
        branchLimit: plan.branchLimit,
        userLimit: plan.userLimit,
        allowsMicrositeTheming: plan.allowsMicrositeTheming,
        allowsFeedImport: plan.allowsFeedImport,
        summary: plan.summary,
        includedFeatures: plan.features.map((label) => ({ label })),
        // Deliberately not public. These are placeholder prices, listed in
        // docs/CONTENT-NEEDED.md, and a pricing page that shows invented numbers to a
        // dealer principal is worse than no pricing page.
        isPublic: false,
        sortOrder: plan.monthlyPrice,
      },
    });
    planIds.set(plan.slug, created.id);
  }
  log(`  plans: ${planIds.size} (all non-public, prices are placeholders)`);

  // ----------------------------------------------------------------- dealerships
  let vehicleTotal = 0;

  for (const dealer of DEALERS) {
    const existing = await payload.find({
      collection: "dealers",
      where: { slug: { equals: dealer.slug } },
      limit: 1,
      depth: 0,
    });
    if (existing.docs[0]) {
      log(`  ${dealer.tradingName}: already seeded, skipping`);
      continue;
    }

    const dealerDoc = await payload.create({
      collection: "dealers",
      data: {
        tradingName: dealer.tradingName,
        legalName: dealer.legalName,
        slug: dealer.slug,
        foundedYear: dealer.foundedYear,
        // Verified, because an unverified dealership cannot have live stock and the whole
        // point of the seed is a browsable site. The verification trail is empty, which is
        // correct: no real evidence was checked, because there is no real business.
        verificationStatus: "verified",
        isDemonstration: true,
        plan: must(planIds, dealer.plan, "plan"),
        listingLimit: 500,
        franchises: dealer.franchises
          .map((f) => franchiseIds.get(f))
          .filter((id): id is number => id !== undefined),
        accreditations: dealer.accreditations
          .map((a) => accreditationIds.get(a))
          .filter((id): id is number => id !== undefined),
        principal: {
          name: dealer.principalName,
          email: `principal@${dealer.slug}.example`,
          phone: dealer.branches[0]?.phone ?? "086 000 0000",
        },
        whatsappNumber: dealer.branches[0]?.phone ?? "086 000 0000",
        verificationNotes:
          "DEMONSTRATION RECORD. This dealership does not exist. No verification was carried out because there is nothing to verify.",
      },
    });

    const branchDocIds: number[] = [];
    for (const branch of dealer.branches) {
      const branchDoc = await payload.create({
        collection: "branches",
        data: {
          name: branch.name,
          slug: slugify(branch.name),
          dealer: dealerDoc.id,
          isPrimary: branch.isPrimary ?? false,
          addressLine1: branch.addressLine1,
          suburb: branch.suburb,
          city: must(cityIds, branch.city, "city"),
          province: must(provinceIds, branch.province, "province"),
          postalCode: branch.postalCode,
          latitude: branch.latitude,
          longitude: branch.longitude,
          phone: branch.phone,
          email: `sales@${dealer.slug}.example`,
          tradingHours: [
            { day: "monday", opensAt: "08:00", closesAt: "17:30", closed: false },
            { day: "tuesday", opensAt: "08:00", closesAt: "17:30", closed: false },
            { day: "wednesday", opensAt: "08:00", closesAt: "17:30", closed: false },
            { day: "thursday", opensAt: "08:00", closesAt: "17:30", closed: false },
            { day: "friday", opensAt: "08:00", closesAt: "17:30", closed: false },
            { day: "saturday", opensAt: "08:30", closesAt: "13:00", closed: false },
            { day: "sunday", closed: true },
          ],
        },
      });
      branchDocIds.push(branchDoc.id);
    }

    // ------------------------------------------------------------------ stock
    const candidates = MAKES.filter((m) => dealer.stockMakes.includes(m.name));
    let created = 0;

    /**
     * Body-type weighting.
     *
     * Picking a model at random produced a floor that was 61 percent SUV, because the model
     * list simply carries more SUV variants than anything else. No South African forecourt
     * looks like that, and a dealer principal would spot it in about four seconds, which
     * would undermine everything else in the demonstration.
     *
     * The first attempt weighted each VARIANT by its body type, which only got it to 45
     * percent: twenty SUV variants at weight 30 still beat twelve hatchback variants at
     * weight 34. So the share is allocated per BODY TYPE and then divided across however
     * many variants that dealership stocks in it. A dealership with one sedan and eight
     * SUVs now still sells sedans at roughly the sedan share.
     *
     * The targets are roughly the shape of the real market: hatchbacks lead on volume, SUVs
     * and crossovers are close behind, bakkies are a large and distinct third, and sedans
     * have been shrinking for a decade.
     */
    const BODY_SHARE: Record<string, number> = {
      Hatchback: 33,
      SUV: 30,
      Bakkie: 24,
      Sedan: 9,
      MPV: 2,
      "Station Wagon": 1,
      Coupe: 1,
    };

    type Choice = { make: (typeof candidates)[number]; model: ModelOf; variant: VariantOf };

    // Group this dealership's actual stock options by body type, respecting bodyFocus.
    // A dealership called Durban Bakkie Centre selling Starlets is the sort of detail that
    // makes a person stop trusting everything else on the page.
    const byBody = new Map<string, Choice[]>();
    for (const make of candidates) {
      for (const model of make.models) {
        for (const variant of model.variants) {
          if (dealer.bodyFocus && !dealer.bodyFocus.includes(variant.body)) continue;
          const list = byBody.get(variant.body) ?? [];
          list.push({ make, model, variant });
          byBody.set(variant.body, list);
        }
      }
    }

    if (byBody.size === 0) {
      throw new Error(
        `seed: ${dealer.tradingName} has a bodyFocus of [${dealer.bodyFocus?.join(", ")}] that matches none of its stockMakes. Nothing would be generated.`,
      );
    }

    // Each body type contributes its share, spread evenly across the variants available in
    // it. Body types this dealership does not stock contribute nothing, and the remaining
    // shares scale up between them, which is correct: a bakkie specialist should be almost
    // all bakkies rather than have its mix quietly rebalanced toward hatchbacks it does not
    // have.
    const weightedPool: Choice[] = [];
    for (const [body, choices] of byBody) {
      const share = BODY_SHARE[body] ?? 3;
      const perVariant = Math.max(1, Math.round((share * 10) / choices.length));
      for (const choice of choices) {
        for (let w = 0; w < perVariant; w += 1) weightedPool.push(choice);
      }
    }

    for (let i = 0; i < dealer.stockCount; i += 1) {
      const choice = pick(weightedPool);
      const make = choice.make;
      const model = choice.model;
      const variant = choice.variant;

      const currentYear = 2026;
      const modelYear = intBetween(variant.yearFrom, currentYear);
      const age = Math.max(0, currentYear - modelYear);

      // Roughly 18 000km a year, with a wide spread, because a three-year-old car with
      // 22 000km and one with 140 000km are both entirely normal and should both appear.
      const mileageKm =
        age === 0
          ? intBetween(50, 4500)
          : Math.round(intBetween(age * 8000, age * 30000) / 100) * 100;

      // Depreciation: a steep first year, then flattening, plus a mileage penalty. The
      // result is a believable spread rather than every car at the same discount.
      const ageFactor = age === 0 ? 1 : 0.82 * 0.92 ** (age - 1);
      const mileagePenalty = Math.min(0.22, (mileageKm / 200000) * 0.28);
      const noise = between(0.96, 1.05);
      const price = roundPrice(variant.priceNew * ageFactor * (1 - mileagePenalty) * noise);

      const condition = age === 0 ? (chance(0.4) ? "new" : "demo") : "pre_owned";

      // Features: a spread, weighted so higher-priced cars carry more of them.
      const featurePool = [...featureIds.values()];
      const featureCount = Math.min(
        featurePool.length,
        intBetween(5, price > 800000 ? 18 : price > 450000 ? 13 : 9),
      );
      const chosenFeatures = new Set<number>();
      while (chosenFeatures.size < featureCount) chosenFeatures.add(pick(featurePool));

      const colour = pick(COLOURS);
      const previousPriceApplies = chance(0.18);

      await payload.create({
        collection: "vehicles",
        data: {
          dealer: dealerDoc.id,
          branch: pick(branchDocIds),
          status: "live",
          condition,
          isDemonstration: true,
          make: must(makeIds, make.name, "make"),
          model: must(modelIds, `${make.name}|${model.name}`, "model"),
          variant: must(variantIds, `${make.name}|${model.name}|${variant.name}`, "variant"),
          modelYear,
          registrationYear: modelYear,
          mileageKm,
          bodyType: must(bodyIds, variant.body, "body type"),
          fuelType: must(fuelIds, variant.fuel, "fuel type"),
          transmission: must(transmissionIds, variant.transmission, "transmission"),
          drivetrain: must(drivetrainIds, variant.drivetrain, "drivetrain"),
          engineCapacityCc: variant.engineCc,
          cylinders: variant.cylinders,
          powerKw: variant.powerKw,
          torqueNm: variant.torqueNm,
          doors: variant.doors,
          seats: variant.seats,
          exteriorColour: must(colourIds, colour.name, "colour"),
          price,
          priceType: "retail",
          vatStatus: "vat_inclusive",
          previousPrice: previousPriceApplies ? roundPrice(price * between(1.03, 1.09)) : undefined,
          stockNumber: `${dealer.slug.slice(0, 3).toUpperCase()}${String(i + 1).padStart(4, "0")}`,
          serviceHistory:
            age === 0
              ? "full_franchise"
              : pick(["full_franchise", "full_franchise", "full_independent", "partial"] as const),
          roadworthy: age === 0 ? "not_required" : "current",
          features: [...chosenFeatures],
          publishedAt: new Date(Date.now() - intBetween(0, 90) * 86400000).toISOString(),
        },
      });
      created += 1;
    }

    vehicleTotal += created;
    log(`  ${dealer.tradingName}: ${dealer.branches.length} branch(es), ${created} vehicles`);
  }

  // -------------------------------------------------------------- finance defaults
  await payload.updateGlobal({
    slug: "finance-defaults",
    data: {
      primeRatePercent: 10.5,
      defaultRateOffsetPercent: 1.5,
      defaultTermMonths: 72,
      defaultDepositPercent: 10,
      defaultBalloonPercent: 0,
      initiationFee: 1207.5,
      monthlyServiceFee: 69,
    },
  });

  log("");
  log(`Done. ${DEALERS.length} demonstration dealerships, ${vehicleTotal} vehicles.`);
  log("Every dealership and every vehicle is flagged isDemonstration.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
