# Deploying Rynet to cPanel

Rynet is a Node application (Next.js plus Payload CMS), so it runs through cPanel's
**Setup Node.js App**, not `public_html`.

It is self-contained. The database is **SQLite**: one file, `rynet.db`, on the cPanel disk. No
database server to create, no connection string to configure, nothing external.

> Your cPanel's own PostgreSQL is version 10, which Payload 3 does not support, and Payload has
> never supported MySQL or MariaDB. SQLite is the only option here, and it is a fine one at this
> stage. The ceiling and the trigger to move are written up in `docs/ARCHITECTURE.md` section 3.

---

## What you upload

Build the bundle on your PC first:

```bash
cd C:\CC\rynet
vendor\node\npm.cmd run deploy:build -- --url https://rynet.co.za
```

That produces two files in `deploy/`:

| File | What it is |
|---|---|
| `rynet-deploy.tar.gz` | The whole app, already built, with the seeded database. About 17 MB. No `node_modules`. |
| `PROD-ENV.txt` | Every environment variable, with a freshly generated `PAYLOAD_SECRET`. You fill in the blanks. |

**The `--url` matters more than it looks.** Next bakes `NEXT_PUBLIC_SERVER_URL` into the build at
compile time. Deploying this bundle to a different hostname means rebuilding it with the new URL,
not editing a variable on the server. If you are going to a staging subdomain first, build for the
staging subdomain, then build again for the live one.

**The build never runs on the server.** Next 16 with Turbopack needs far more memory than a shared
CloudLinux account allows, and it gets killed rather than erroring usefully. That is why the bundle
ships prebuilt.

---

## 1. Create the Node application

cPanel, **Setup Node.js App**, **Create Application**:

| Field | Value |
|---|---|
| Node.js version | **22** (or 20 if 22 is not offered) |
| Application mode | **Production** |
| Application root | `rynet` |
| Application URL | `rynet.co.za` |
| Application startup file | `server.cjs` |

Save. Keep this screen open, you come back to it three more times.

## 2. Upload and extract

File Manager, into `~/rynet`:

1. Upload `rynet-deploy.tar.gz`.
2. Right-click it, **Extract**, into `~/rynet`.
3. Delete the archive once it has extracted.

You should now have `.next/`, `src/`, `scripts/`, `server.cjs`, `package.json`, `rynet.db` and an
empty `media/` in the application root. If `.next` is missing, File Manager is hiding dotfiles:
turn on **Show Hidden Files** in its settings.

## 3. Set the environment variables

Back on the Setup Node.js App screen, add each line from `PROD-ENV.txt`.

Fill in the `<FILL IN>` values:

- **SMTP.** Create a mailbox in cPanel first, then use its host, port, username and password.
  Leave `SMTP_HOST` blank for now if you like; Payload logs emails to the console instead of
  sending, which is fine until the enquiry forms are live.
- **PayFast.** Sandbox credentials to begin with. `PAYFAST_SANDBOX=true` until a real low-value
  charge has been tested end to end.

`PAYLOAD_SECRET` is already generated and is unique to this bundle. It signs sessions and encrypts
stored secrets. **Do not reuse it anywhere else and do not change it after go-live**, or every
signed-in session breaks at once.

## 4. Install dependencies

Click **Enter to the virtual environment** on the Node App screen to copy the activation command,
then run it, then:

```bash
npm install --omit=dev
```

`--omit=dev` on purpose. It skips the build tooling you do not need here, and more importantly it
skips Playwright, which would otherwise try to download three browsers onto a shared host.

This step is where `sharp` and the SQLite client compile or fetch their **Linux** binaries. That is
the whole reason `node_modules` is not in the bundle: the ones on the build PC are Windows builds
and would not run here.

Expect two to four minutes. It installs around 540 packages.

## 5. Start

**Restart** on the Setup Node.js App screen. Then check:

- Public site: `https://rynet.co.za`
- Search: `https://rynet.co.za/cars` should show 311 vehicles across 13 pages
- Admin: `https://rynet.co.za/admin`

Sign in as `admin@rynet.co.za` with `ChangeMe123!` and **change the password immediately**.

Confirm AutoSSL has issued the certificate before you share the URL with anyone.

---

## Updating later

1. Build a new bundle on your PC with the same `--url`.
2. Upload and extract over the app root.
3. **Do not overwrite `rynet.db` or `media/`.** Those hold your live data. Extract the archive,
   then if it replaced them, restore them from a backup. Safest is to move both aside first,
   extract, then move them back.
4. `npm install --omit=dev` only if the dependencies changed.
5. **If the schema changed**, run `npm run db:migrate` before restarting. Migrations live in
   `src/migrations/` and are checked into the repo.
6. **Restart.**

## Backups

Your entire site state is two things: **`rynet.db`** and the **`media/`** folder. Back them up
together and you have everything.

`rynet.db` is a single SQLite file, so a backup is a file copy and a restore is a file copy back.
Do a restore drill before you have real dealers on the platform, not after.

Set up a cPanel cron job to copy `rynet.db` somewhere dated, daily. A database you have never
restored is not a backup.

---

## Things that have already been tested, so you do not have to discover them

These were all found by extracting the bundle onto a clean directory and running it exactly as
Passenger will. Each one would have stopped the deploy.

**`npm install` used to abort immediately.** The `prepare` script ran husky, which is a dev
dependency and therefore absent under `--omit=dev`, so the whole install exited non-zero before
linking a single package. `prepare` now runs `scripts/prepare.mjs`, which does nothing outside a
git checkout.

**The archive used to be a zip, and the zip was broken.** Windows PowerShell 5.1's
`Compress-Archive` writes backslashes as the path separator inside the zip, which is not valid zip.
Extracting it on Linux gives one flat pile of files named `src\collections\Users.ts` instead of a
directory tree. It is a `.tar.gz` now, which cPanel's File Manager extracts from the same
right-click menu.

**The bundle used to be 475 MB.** `.next/cache` and `.next/dev` are build-time only and are now
excluded. It is 17 MB.

**The admin used to break on a CSP error.** The Payload admin needs `unsafe-eval` and the public
site must not have it, so there are two policies. Both header rules matched `/admin` and the
public one won, leaving the admin with a policy that killed it. The public rule now excludes
`/admin` explicitly.

**Turbopack leaves absolute Windows symlinks in `.next/node_modules`.** It externalises `sharp`,
the SQLite client and six others and links them by absolute path. Those are meaningless on Linux
and point at Windows binaries besides. Removing them gives a working home page and a 500 on
`/cars` and `/admin`, so they are load-bearing. The build records what they should be and
`server.cjs` recreates them against the host's own `node_modules` on every start. You should see
`Linked 8 runtime package(s)` in the log the first time.

---

## Troubleshooting

**502, or it will not start.** Read the log: Node App screen, or `~/rynet/stderr.log`. Almost
always a missing `PAYLOAD_SECRET`, or the app root not being writable so SQLite cannot open
`rynet.db`.

**"Could not link runtime packages" in the log.** `npm install --omit=dev` did not complete. Run
it again in the virtual environment, then Restart.

**Admin loads but the editor is blank, or the console shows a CSP error about `eval`.** The
`/admin` header rule is not matching. Confirm `next.config.ts` extracted correctly and Restart.

**Images 404 after an upload.** `media/` is missing or not writable. Create it in the app root and
give it 755.

**"readonly database".** `rynet.db` or the app root is not owned by your cPanel user. It will be
if you uploaded it there rather than moving it from elsewhere.

**`npm install` is killed part way.** CloudLinux memory or process limit. Retry; it resumes. If it
keeps failing, ask the host to raise the Node app's limits.

---

## Two things to sort out reasonably soon

**Cloudflare and R2.** The site currently serves everything from the cPanel box with no CDN, and
uploads go to `media/` on that disk. That is fine while there are no vehicle photographs. It stops
being fine the moment real stock arrives: twenty photos per listing across a few hundred vehicles
is tens of thousands of small files, and shared hosting caps inodes long before it caps disk. Set
the `R2_*` variables and media moves to Cloudflare R2 with no code change and no new build.

**The two host questions.** Still open, and both take one support ticket: is the home directory on
local disk or NFS (SQLite's file locking is unsafe on NFS), and does Passenger run one Node process
or several. Neither blocks this deploy. Both shape what happens after it. See
`docs/QUESTIONS.md`.
