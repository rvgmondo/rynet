import { defineConfig, devices } from "@playwright/test";

/**
 * End to end configuration.
 *
 * Runs against a real production build rather than the dev server. Dev has React's
 * development bundle, no minification, and different CSP, so a suite that passes there
 * proves less than it looks. It is also the only honest way to measure anything, since the
 * host has no preview deployments and CI is where these budgets get enforced.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Most South African traffic to a car marketplace is mobile. Testing only desktop
    // would be testing the minority case.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        // The whole suite shares one visitor hash, so the production limit of five would
        // lock the run out partway through. Raised here only, never in the shipped default.
        env: { ENQUIRY_RATE_LIMIT: "1000" },
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
