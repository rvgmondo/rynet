import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests.
 *
 * The include pattern is not decoration. Without it Vitest globs every `*.spec.ts` in the
 * repository, picks up the Playwright suite in `e2e/`, and dies with "Playwright Test did
 * not expect test.describe() to be called here", which is a confusing way to learn that two
 * test runners are fighting over the same files.
 *
 * So: Vitest owns `src/**` and only `.test.ts`. Playwright owns `e2e/` and only `.spec.ts`.
 * Two runners, two extensions, two directories, no overlap.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e", "deploy", "vendor"],
    environment: "node",
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
