/**
 * Passenger entry point for cPanel "Setup Node.js App".
 *
 * The host launches this file and supplies the port through process.env.PORT. It starts the
 * already-built Next application; the build itself never runs here (see README).
 *
 * CommonJS on purpose, so it works regardless of package.json "type": "module".
 */

// Cap the thread pools BEFORE anything loads. CloudLinux reports dozens of cores on a shared
// box while capping the process count hard, and sharp, the SQLite client and libuv all
// default to one thread per reported core. Left alone they hit the ceiling and the app dies
// with an unhelpful fork error. Anything the host already set wins.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "4";
process.env.TOKIO_WORKER_THREADS = process.env.TOKIO_WORKER_THREADS || "2";
process.env.VIPS_CONCURRENCY = process.env.VIPS_CONCURRENCY || "1";
process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED || "1";

const { createServer } = require("node:http");
const next = require("next");
const { linkRuntimeDeps } = require("./scripts/link-runtime-deps.cjs");

// Makes relative paths resolve to the app root, in particular the SQLite `file:./rynet.db`,
// no matter which working directory the host starts this process in.
process.chdir(__dirname);

// Turbopack externalises sharp, the SQLite client and a few others, and links them into
// .next/node_modules using absolute build-machine paths. Those are meaningless here, and
// they would point at Windows binaries besides. Recreating them against this host's own
// node_modules is idempotent, costs milliseconds, and removes a deploy step that would
// otherwise have to be remembered. See scripts/link-runtime-deps.cjs for the detail.
const links = linkRuntimeDeps(__dirname, (m) => console.log(m));
if (links.created > 0) console.log(`Linked ${links.created} runtime package(s).`);
if (links.failed.length > 0) {
  console.error("Could not link runtime packages:", links.failed.join("; "));
  console.error("Run `npm install --omit=dev` in the app root, then Restart.");
}

const port = process.env.PORT || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`Rynet ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Next.js:", err);
    process.exit(1);
  });
