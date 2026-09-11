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
    //
    // Two suites are excluded. The isolation suite never opens a page: it is HTTP against
    // the REST API, so a second run at a phone viewport proves nothing and doubles the
    // sign-ins against accounts that lock after eight attempts. The two-factor suite enrols
    // and unenrols a shared account, so a second concurrent run would be signing in against
    // a second factor it did not know had just been switched on.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: /(isolation|two-factor)\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        // The whole suite shares one visitor hash, so the production limit of five would
        // lock the run out partway through. Raised here only, never in the shipped default.
        env: {
          ENQUIRY_RATE_LIMIT: "1000",
          /*
           * The suite runs the app on 3100 while the build was made against 3000, and Payload
           * will not accept a session cookie from an origin it has not been told is ours. The
           * whole two-factor suite drives the real page in a real browser, so it is the only
           * part of the suite that authenticates by cookie, and it was the only part failing.
           */
          SERVER_URL: "http://localhost:3100",
        },
        url: "http://localhost:3100",
        /**
         * Never reuse, not even locally.
         *
         * Reuse cost this project two debugging sessions. A server left running from before
         * a rebuild answers on the port, Playwright adopts it, and the whole suite tests the
         * previous build while reporting on the current one. The isolation suite made that
         * spectacular: an access control fix looked like it had failed, twice, because the
         * process serving the requests predated it.
         *
         * With reuse off, a leftover server is a loud "address already in use" instead of a
         * quiet wrong answer. Kill the stray process; do not trust the green tick.
         */
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
