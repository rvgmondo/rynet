/**
 * Builds the cPanel deploy bundle.
 *
 * The build NEVER runs on the server. Next 16 with Turbopack needs far more memory than
 * CloudLinux allows a shared account, and the failure mode is an unhelpful kill rather than
 * an error you can act on. So the build happens here and ships prebuilt.
 *
 * What does NOT ship is `node_modules`. `sharp` and the SQLite client both compile or
 * download platform-specific binaries, and this machine's are Windows ones. They get
 * installed on the host, once, by the Setup Node.js App button.
 *
 * Usage:
 *   node scripts/build-deploy.mjs --url https://rynet.co.za
 *
 * `--url` is baked into the build. Next inlines NEXT_PUBLIC_* at build time, so deploying
 * this bundle to a different hostname means rebuilding it, not editing an environment
 * variable on the server. That is the single easiest thing to get wrong here.
 */

import { execFileSync, execSync } from "node:child_process";
import crypto from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployDir = path.join(root, "deploy");
const stageDir = path.join(deployDir, "rynet");

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const serverUrl = urlIndex >= 0 ? args[urlIndex + 1] : "https://rynet.co.za";

if (!/^https?:\/\/[^/]+$/.test(serverUrl)) {
  console.error(`\n"${serverUrl}" is not a bare origin.`);
  console.error("Expected something like https://rynet.co.za, with no trailing slash or path.\n");
  process.exit(1);
}

const log = (m) => console.log(m);

log(`\nBuilding the Rynet deploy bundle for ${serverUrl}\n`);

// ---------------------------------------------------------------- 1. build

log("1. Building. This bakes the URL in, so it has to happen before packaging.");
// Clean first. A .next carried over from `npm run dev` keeps a .next/dev directory that is
// several hundred megabytes of development artefacts, and it would otherwise be staged.
rmSync(path.join(root, ".next"), { recursive: true, force: true });
execSync("npm run build", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_SERVER_URL: serverUrl,
    // Bump the deployment id so Cloudflare re-fetches the new asset URLs rather than
    // serving a cached chunk from the previous build.
    NEXT_DEPLOYMENT_ID: `d${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
      .toString(36)
      .slice(-4)}`,
  },
});

// ---------------------------------------------------------------- 2. stage

log("\n2. Staging the files the host actually needs.");
rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

// `src/` ships because Payload's CLI loads the real config at runtime for `db:migrate`,
// and because `src/migrations/` is how the schema moves forward on every deploy after the
// first. `tsconfig.json` ships with it, for the @payload-config path alias.
const include = [
  ".next",
  "src",
  "public",
  "server.cjs",
  // server.cjs requires the runtime linker from here.
  "scripts/link-runtime-deps.cjs",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
];

/**
 * Turbopack's external package links.
 *
 * It symlinks sharp, the SQLite client and a few others into `.next/node_modules` under
 * hashed names, using ABSOLUTE build-machine paths. Those cannot ship: the path is a
 * Windows one, and it points at Windows binaries that would shadow the host's correct
 * Linux ones.
 *
 * So the links are recorded here and recreated on the host at startup, against whatever
 * `npm install` put in its own node_modules. Verified as load-bearing: with
 * `.next/node_modules` removed, the home page still renders and /cars and /admin both 500.
 */
function recordRuntimeLinks() {
  const dir = path.join(root, ".next", "node_modules");
  if (!existsSync(dir)) return [];

  const found = [];
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (lstatSync(full).isSymbolicLink()) {
        // `sharp-20c6a5da84e2135f` resolves to the package `sharp`. The hash is Turbopack's
        // naming, and the target is always node_modules/<package>.
        const target = readlinkSync(full);
        const pkg = path
          .relative(path.join(root, "node_modules"), path.resolve(path.dirname(full), target))
          .split(path.sep)
          .join("/");
        found.push({ link: rel, package: pkg });
      } else if (entry.isDirectory()) {
        walk(full, rel);
      }
    }
  };
  walk(dir, "");
  return found;
}

const runtimeLinks = recordRuntimeLinks();

/**
 * Never staged, however they got there:
 *
 *   .next/cache        the build cache. Hundreds of megabytes, and useless on the host
 *                      because the host never builds.
 *   .next/dev          development artefacts left by `npm run dev`. The clean above removes
 *                      them, and this is the belt to that pair of braces, because shipping
 *                      338MB of them once is a mistake you only want to make in a script
 *                      you can fix.
 *   .next/node_modules absolute Windows symlinks. Recreated on the host, see above.
 */
const EXCLUDE = new Set([
  path.join(".next", "cache"),
  path.join(".next", "dev"),
  path.join(".next", "node_modules"),
]);

for (const entry of include) {
  const from = path.join(root, entry);
  if (!existsSync(from)) {
    log(`   skipped ${entry} (not present)`);
    continue;
  }
  cpSync(from, path.join(stageDir, entry), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(root, src);
      for (const skip of EXCLUDE) {
        if (rel === skip || rel.startsWith(`${skip}${path.sep}`)) return false;
      }
      return true;
    },
  });
  log(`   ${entry}`);
}

writeFileSync(
  path.join(stageDir, ".next", "runtime-links.json"),
  JSON.stringify(runtimeLinks, null, 2),
  "utf8",
);
log(`   .next/runtime-links.json (${runtimeLinks.length} links, recreated on the host at start)`);

// The uploads directory has to exist and be writable before the first admin upload.
mkdirSync(path.join(stageDir, "media"), { recursive: true });
writeFileSync(path.join(stageDir, "media", ".gitkeep"), "");
log("   media/ (empty, for uploads)");

// The seeded database. Shipped so the site has content the moment it starts, rather than
// needing a seed run on a host with a low process limit.
const db = path.join(root, "rynet.db");
if (existsSync(db)) {
  cpSync(db, path.join(stageDir, "rynet.db"));
  log("   rynet.db (seeded)");
} else {
  log("   WARNING: no rynet.db found. Run `npm run db:migrate && npm run seed` first.");
}

// ------------------------------------------------------- 3. environment file

log("\n3. Writing the environment variables.");
const secret = crypto.randomBytes(32).toString("hex");
const env = `# Rynet production environment
#
# Paste each line into cPanel: Setup Node.js App, Environment variables.
# Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} for ${serverUrl}
#
# NEXT_PUBLIC_SERVER_URL is baked into the build. Changing it here does NOT change the
# built site. To move to a different hostname, rebuild the bundle with:
#   node scripts/build-deploy.mjs --url https://the-new-host

NODE_ENV=production
DATABASE_URI=file:./rynet.db
PAYLOAD_SECRET=${secret}
NEXT_PUBLIC_SERVER_URL=${serverUrl}

# Email. Use a mailbox created in cPanel. Leave SMTP_HOST blank and Payload logs to the
# console instead of sending, which is fine until the enquiry forms are live.
SMTP_HOST=<FILL IN>
SMTP_PORT=587
SMTP_USER=<FILL IN>
SMTP_PASS=<FILL IN>
EMAIL_FROM=noreply@${serverUrl.replace(/^https?:\/\//, "")}

# Cloudflare R2 for vehicle photography. Leave blank and uploads go to media/ on the cPanel
# disk, which is correct while there are no photos. Set these BEFORE the first dealer
# uploads: shared hosting runs out of inodes long before it runs out of disk.
NEXT_PUBLIC_MEDIA_HOSTNAME=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=

# PayFast. Sandbox until a real charge has been tested end to end.
PAYFAST_MERCHANT_ID=<FILL IN>
PAYFAST_MERCHANT_KEY=<FILL IN>
PAYFAST_PASSPHRASE=<FILL IN>
PAYFAST_SANDBOX=true

# Thread pool caps. server.cjs sets these itself, and they are here so the values are
# visible rather than buried: CloudLinux reports dozens of cores while capping the process
# count, and sharp plus the SQLite client will each try to spawn one thread per core.
UV_THREADPOOL_SIZE=4
TOKIO_WORKER_THREADS=2
VIPS_CONCURRENCY=1
`;
writeFileSync(path.join(deployDir, "PROD-ENV.txt"), env, "utf8");
log("   deploy/PROD-ENV.txt, with a freshly generated PAYLOAD_SECRET");

// ---------------------------------------------------------------- 4. zip

/**
 * Compressed with tar, not PowerShell.
 *
 * Windows PowerShell 5.1's `Compress-Archive` writes BACKSLASHES as the path separator
 * inside the zip. That is not valid zip, and extracting the result on Linux produces one
 * flat pile of files with names like `src\collections\Users.ts` rather than a directory
 * tree. It fails loudly with `unzip` and silently in some GUI extractors, which is worse.
 * PowerShell 7 fixed it; this machine has 5.1.
 *
 * GNU tar is present, writes correct forward-slash paths, and cPanel's File Manager
 * extracts `.tar.gz` from its right-click menu exactly like a zip.
 */
log("\n4. Compressing.");
const archivePath = path.join(deployDir, "rynet-deploy.tar.gz");
rmSync(archivePath, { force: true });
rmSync(path.join(deployDir, "rynet-deploy.zip"), { force: true });
// `--force-local` because GNU tar reads the colon in `C:\...` as a remote host separator
// and tries to reach a machine called C. Forward slashes for the same reason.
execFileSync(
  "tar",
  [
    "--force-local",
    "-czf",
    archivePath.split(path.sep).join("/"),
    "-C",
    stageDir.split(path.sep).join("/"),
    ".",
  ],
  { stdio: "inherit" },
);

const sizeMb = (readFileSync(archivePath).byteLength / 1024 / 1024).toFixed(1);
log(`   deploy/rynet-deploy.tar.gz (${sizeMb} MB)`);

log(`
Done.

  deploy/rynet-deploy.tar.gz   Upload and extract into the app root on cPanel
  deploy/PROD-ENV.txt          Paste into Setup Node.js App, Environment variables

Then follow DEPLOY-CPANEL.md. The short version is: create the Node app with
server.cjs as the startup file, extract the archive, paste the variables, run
npm install --omit=dev once, and Restart.
`);
