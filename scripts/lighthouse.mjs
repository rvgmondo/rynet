/**
 * Lighthouse, against a running production build, on the pages a buyer and a dealer land on, on
 * a throttled phone (Lighthouse's mobile profile, applied for real).
 *
 * Run `npm run build`, start it (`npm run start -- --port 3100`), then `npm run lighthouse`.
 * CI does the same after the end to end suite. LHCI_BASE_URL points it somewhere else.
 *
 * WHAT IT HOLDS
 *
 * The budget in docs/DELIVERY-PLAN.md, in full: 95 or above in performance, accessibility, best
 * practices and SEO, LCP under 2 seconds and layout shift under 0.05. CI is where it is judged. On
 * CI's runner every page scored 0.99 with LCP about 1.5 seconds (18 October 2026). The same run on
 * a busy Windows laptop scores far lower, so a local miss is worth reading but is not the verdict.
 *
 * The listing and the dealership are looked up from the running site rather than written in,
 * because a seeded listing's address carries a random reference.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

/** The plan's line. LHCI_PERF_FLOOR loosens it for a local look on a slow machine, never in CI. */
const PERF_FLOOR = Number(process.env.LHCI_PERF_FLOOR || 0.95);
const LCP_CEILING_MS = Number(process.env.LHCI_LCP_CEILING_MS || 2000);

const BASE = (process.env.LHCI_BASE_URL || "http://localhost:3100").replace(/\/$/, "");

async function json(url) {
  const response = await fetch(`${BASE}${url}`);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

// A real dealership's car where there is one. Demonstration stock is noindex on purpose (it must
// never reach a search engine), so it is measured like any page but not graded on SEO.
const LIVE = "/api/vehicles?where[status][equals]=live&sort=-updatedAt&limit=1&depth=1";
const listing =
  (await json(`${LIVE}&where[isDemonstration][not_equals]=true`)).docs[0] ??
  (await json(LIVE)).docs[0];
const DEALERS = "/api/dealers?limit=1&depth=0&sort=tradingName";
const dealer =
  (await json(`${DEALERS}&where[isDemonstration][not_equals]=true`)).docs[0] ??
  (await json(DEALERS)).docs[0];
const dealerPath = dealer ? `/dealers/${dealer.slug}` : null;

const vehiclePath = listing
  ? `/vehicles/${listing.make?.slug}/${listing.model?.slug}/${[
      listing.modelYear,
      listing.variant?.name
        ? listing.variant.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : null,
      String(listing.publicRef).toLowerCase(),
    ]
      .filter(Boolean)
      .join("-")}`
  : null;

const pages = [
  "/",
  "/cars",
  vehiclePath,
  dealerPath,
  "/privacy",
  "/list-your-stock",
  "/digital",
  "/portal/sign-in",
].filter(Boolean);

const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unindexed = [
  "/portal/",
  ...(listing?.isDemonstration && vehiclePath ? [vehiclePath] : []),
  ...(dealer?.isDemonstration && dealerPath ? [dealerPath] : []),
];
const seoPattern = `^(?!.*(${unindexed.map(literal).join("|")})).*$`;

const config = {
  ci: {
    collect: {
      url: pages.map((page) => `${BASE}${page}`),
      numberOfRuns: Number(process.env.LHCI_RUNS || 3),
      chromePath: chromium.executablePath(),
      settings: {
        // The default mobile profile: a mid-range phone on slow 4G (150ms round trip, 1.6 Mbps
        // down, CPU slowed four times), which is the South African buyer the budget is written for.
        //
        // Applied for real ("devtools"), not simulated. The simulation replays an unthrottled
        // load, and from localhost every script arrives before the first frame, so it charges the
        // whole bundle to the first paint: the privacy page painted at 0.5 seconds and was scored
        // at 3. Slowing the network and CPU for real measures what a phone would see.
        throttlingMethod: "devtools",
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: ".*",
          assertions: {
            "categories:performance": [
              "error",
              { minScore: PERF_FLOOR, aggregationMethod: "median" },
            ],
            "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
            "categories:best-practices": ["error", { minScore: 0.95, aggregationMethod: "median" }],
            "largest-contentful-paint": [
              "error",
              { maxNumericValue: LCP_CEILING_MS, aggregationMethod: "median" },
            ],
            "cumulative-layout-shift": [
              "error",
              { maxNumericValue: 0.05, aggregationMethod: "median" },
            ],
          },
        },
        {
          // Every public page must be findable. The portal must not be, and nor may demonstration
          // stock, so both are left out here.
          matchingUrlPattern: seoPattern,
          assertions: {
            "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median" }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};

const dir = path.join(process.cwd(), ".lighthouseci");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, "lighthouserc.json");
writeFileSync(file, JSON.stringify(config, null, 2));

console.log(`Lighthouse on ${pages.length} pages, ${config.ci.collect.numberOfRuns} runs each:`);
for (const page of pages) console.log(`  ${page}`);

const lhci = (step) =>
  spawnSync("npx", ["lhci", step, `--config=${file}`], { stdio: "inherit", shell: true }).status;

const failed = [lhci("collect"), lhci("upload"), lhci("assert")].some((status) => status !== 0);
process.exit(failed ? 1 : 0);
