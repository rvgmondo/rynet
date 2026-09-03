/**
 * Recreates Turbopack's runtime package links.
 *
 * WHY THIS EXISTS
 *
 * Turbopack marks a handful of packages as external rather than bundling them, because they
 * are native or CommonJS: sharp, @libsql/client, pg, graphql, pino, pino-pretty, drizzle-kit
 * and @aws-sdk/client-s3. It then symlinks each into `.next/node_modules` under a hashed
 * name, and the compiled server code requires them through that path.
 *
 * Two things about those links make them undeployable as-is:
 *
 *   1. They are ABSOLUTE paths. On the build machine they read
 *      `C:\CC\rynet\node_modules\sharp`, which means nothing on a Linux host.
 *   2. Even relative, they would point at Windows binaries. `sharp` and `@libsql` ship
 *      compiled artefacts per platform, and the host installs its own correct ones.
 *
 * Verified rather than assumed: removing `.next/node_modules` and starting the server gives
 * a working home page and a 500 on /cars and /admin. They are load-bearing.
 *
 * So the build writes a manifest of link name to package name, and this recreates the links
 * on the host pointing at the host's own node_modules. It is idempotent and runs on every
 * start, which means one less step a deploy can forget.
 */

const fs = require("node:fs");
const path = require("node:path");

const MANIFEST = ".next/runtime-links.json";

/**
 * @param {string} root Application root, the directory holding package.json.
 * @param {(msg: string) => void} log
 * @returns {{ created: number, skipped: number, failed: string[] }}
 */
function linkRuntimeDeps(root, log = () => {}) {
  const manifestPath = path.join(root, MANIFEST);
  const result = { created: 0, skipped: 0, failed: [] };

  if (!fs.existsSync(manifestPath)) {
    // No manifest means a build that did not produce external links, which is fine.
    return result;
  }

  /** @type {{ link: string, package: string }[]} */
  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  for (const entry of entries) {
    const linkPath = path.join(root, ".next", "node_modules", entry.link);
    const target = path.join(root, "node_modules", entry.package);

    // Already correct? Leave it. This is the normal case on a restart.
    try {
      if (fs.existsSync(linkPath) && fs.realpathSync(linkPath) === fs.realpathSync(target)) {
        result.skipped += 1;
        continue;
      }
    } catch {
      // A broken link throws on realpath. Fall through and replace it.
    }

    if (!fs.existsSync(target)) {
      result.failed.push(`${entry.package} is not installed`);
      continue;
    }

    try {
      fs.rmSync(linkPath, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(linkPath), { recursive: true });
      // Relative, so the app directory can be moved or renamed without breaking.
      const relative = path.relative(path.dirname(linkPath), target);
      fs.symlinkSync(relative, linkPath, "junction");
      result.created += 1;
    } catch (linkError) {
      // Some hosts disallow symlink creation. Copying is heavier but always works, and
      // these are the host's own correctly-built packages either way.
      try {
        fs.cpSync(target, linkPath, { recursive: true, dereference: true });
        result.created += 1;
        log(`  copied ${entry.package} (symlink refused: ${linkError.code || linkError.message})`);
      } catch (copyError) {
        result.failed.push(`${entry.package}: ${copyError.message}`);
      }
    }
  }

  return result;
}

module.exports = { linkRuntimeDeps, MANIFEST };
