/**
 * npm `prepare` hook.
 *
 * Installs husky's git hooks for local development, and does nothing anywhere else.
 *
 * This exists because `"prepare": "husky"` breaks the production install. npm runs `prepare`
 * on every `npm install`, including `npm install --omit=dev`, which is what the cPanel host
 * runs. husky is a dev dependency, so it is not there, and the whole install aborts with a
 * non-zero exit before a single package is linked. The deploy stops before it starts.
 *
 * Two guards, because either alone leaves a hole: skip when there is no `.git` directory
 * (a deployed app root is not a repository), and swallow the error if husky is absent
 * anyway.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (
  process.env.CI ||
  process.env.NODE_ENV === "production" ||
  !existsSync(path.join(root, ".git"))
) {
  process.exit(0);
}

try {
  const husky = await import("husky");
  (husky.default ?? husky)();
} catch {
  // Not installed, which is fine. Git hooks are a convenience, never a requirement.
}
