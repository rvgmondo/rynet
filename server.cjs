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

// Makes relative paths resolve to the app root, in particular the SQLite `file:./rynet.db`,
// no matter which working directory the host starts this process in.
process.chdir(__dirname);

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
