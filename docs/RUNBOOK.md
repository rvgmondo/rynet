# RUNBOOK

What to do when something needs doing, or has gone wrong. Written to be followed at speed by
someone who did not build it.

---

## The whole system, in one paragraph

One Node process on cPanel, started by `server.cjs` through Passenger. One SQLite file,
`rynet.db`, holding every dealership, listing and lead. One folder, `media/`, holding uploads.
Everything else is code and can be redeployed from git in minutes. **If you have `rynet.db` and
`media/`, you have the platform.**

---

## Backups

### Setting it up, once

cPanel, Cron Jobs, daily at 02:00:

```bash
/bin/bash /home/rynetco/rynet/scripts/backup.sh
```

It writes to `~/backups/rynet/YYYY-MM-DD_HHMM/` and keeps 30 days.

It uses `sqlite3 .backup` rather than `cp`, because copying a live SQLite file can capture it
mid-write and produce a database that opens fine and is subtly corrupt. If `sqlite3` is not on
the host it falls back to `cp` and says so loudly in the cron output. If you see that warning, ask
the host to install sqlite3.

Pruning happens **after** a successful backup, never before, so a failed run cannot leave you with
neither the old copy nor the new one.

### The restore drill, which you must actually do

A backup you have never restored is not a backup. Do this before there is data worth losing.

1. Take a backup by hand: `/bin/bash ~/rynet/scripts/backup.sh`
2. Note the current stock count on `/cars`.
3. Copy the app somewhere harmless: `cp -r ~/rynet ~/rynet-drill`
4. In the copy, replace the database with the backup:
   ```bash
   cd ~/rynet-drill
   gunzip -c ~/backups/rynet/<stamp>/rynet.db.gz > rynet.db
   ```
5. Start it on another port and check the stock count matches:
   ```bash
   PORT=3999 node server.cjs
   ```
6. Write down how long the whole thing took, and delete `~/rynet-drill`.

**Record the date and the timing at the bottom of this file.** An undated drill is a drill nobody
can prove happened.

### Restoring for real

```bash
# 1. Stop the app: Setup Node.js App, Stop.
# 2. Move the broken database aside rather than deleting it. It may still be readable, and
#    it is the only record of anything written since the last backup.
mv ~/rynet/rynet.db ~/rynet/rynet.db.broken-$(date +%Y%m%d-%H%M)

# 3. Restore.
gunzip -c ~/backups/rynet/<stamp>/rynet.db.gz > ~/rynet/rynet.db

# 4. Media, only if that is what was lost. It is large and usually intact.
tar -xzf ~/backups/rynet/<stamp>/media.tar.gz -C ~/rynet

# 5. Start: Setup Node.js App, Restart. Check /cars shows stock.
```

**Everything written since that backup is gone.** Leads especially. Check `~/backups/rynet/` for a
more recent one before settling for an old one.

---

## Deploying

Full detail in [DEPLOY-GIT.md](../DEPLOY-GIT.md). The short version:

1. Push to `main`. GitHub Actions builds and publishes the `deploy` branch, roughly 90 seconds.
2. cPanel, Git Version Control: **Update from Remote**, then **Deploy HEAD Commit**.
3. Setup Node.js App: **Restart**.

Then check `~/rynet/DEPLOYED.txt` to confirm which commit is actually running.

**Only when dependencies changed:** `cd ~/rynet && npm install --omit=dev`
**Only when the schema changed:** `cd ~/rynet && npx payload migrate`

Use `npx`, not `npm run`. This host runs npm lifecycle scripts from the virtualenv lib directory
rather than the app root, so anything with a relative path in it looks in the wrong place.

---

## When something is wrong

### The site is down, 502 or will not start

1. **Read the log first.** Setup Node.js App, or `~/rynet/stderr.log`. It usually says exactly
   what is missing.
2. Most common causes, in order:
   - `PAYLOAD_SECRET` missing from the environment variables.
   - `rynet.db` not writable, or the app root not owned by the cPanel user.
   - `npm install` was never run, or was killed part way. Run it again.
   - A deploy replaced `.next` while the app was running. Restart.
3. `Could not link runtime packages` in the log means `npm install --omit=dev` did not complete.
   Run it again, then Restart.

### The admin loads but the editor is blank

A Content Security Policy error in the browser console mentioning `eval`. The `/admin` route needs
its own policy and is not getting it. Confirm `next.config.ts` deployed intact, then Restart.

### "readonly database"

`rynet.db` or the app root is not owned by the cPanel user. It will be if the file was uploaded
there rather than moved from somewhere else.

```bash
ls -la ~/rynet/rynet.db     # should be owned by rynetco
chmod 644 ~/rynet/rynet.db
```

### `SQLITE_BUSY` in the logs

**This is the signal to move to Postgres.** SQLite serialises writes, and this means concurrent
writes are now colliding under normal load. It is written up in `docs/ARCHITECTURE.md` section 3,
along with the other two triggers: roughly 25 dealerships actively managing stock, or p95 search
above 300ms.

Short term: check whether a feed import is running, since those are the heaviest writers.

### Enquiries have stopped arriving

Work through it in this order, because each rules out the next.

1. **Is anything being written at all?** Admin, Leads, sorted newest. If records are arriving,
   the problem is email, not the form.
2. **Is email configured?** If `SMTP_HOST` is blank, Payload logs to the console and sends
   nothing. That is the default and it is easy to forget.
3. **Is the rate limiter rejecting people?** Five per ten minutes per visitor. If a dealership
   is testing from one office, they will hit it. `ENQUIRY_RATE_LIMIT` overrides it.
4. **Submit one yourself** on a listing, and watch `stderr.log` while you do.

Two failure modes here have bitten before and both looked like success:

- **A `"use server"` module exporting anything other than an async function.** Next then never
  creates the action reference, the form falls back to a plain HTML POST, the page navigates, and
  nothing is written. The form appears to submit.
- **The timing check misfiring.** The form rejects anything submitted within two seconds of
  opening, and reports success when it does, because telling a bot it was caught tells whoever
  wrote it what to change. If that value is ever computed at render rather than at submit, every
  genuine enquiry is silently discarded.

### Images 404 after an upload

`media/` is missing or not writable.

```bash
mkdir -p ~/rynet/media && chmod 755 ~/rynet/media
```

Once R2 is configured this stops being possible, because uploads no longer touch the cPanel disk.

---

## Onboarding a dealership

Admin, **Onboard a dealership** (`/admin/onboard`). One screen, three steps, and the dealership
does nothing:

1. **Who they are.** Name, who you spoke to, phone, address, and how you confirmed they are a
   registered dealership that agreed to list. That sentence is saved on their record as the reason
   they are verified. The dealership and its main branch are created together, verified, allowed
   1 000 cars during the launch.
2. **Their cars.** Paste their own website and press **Check it**. If it is a WordPress site on the
   Motors theme (Amico's is, and so are many small dealerships'), it says how many cars it found
   and how the first one reads, and one more press loads them all and keeps them up to date from
   then on. Anything else, or a portal: download the template, or take their own stock export,
   save it as CSV and upload it. Column names do not have to match.
3. **Tell them.** Their showroom link and a WhatsApp message with it, ready to send from your phone.

A car with no price, no mileage, no year or no photograph is loaded but held back, with the reason
on it. The desk links straight to those cars: add what is missing and set them live.

**No login is created.** There is nowhere for a dealership to sign in yet (the admin is staff only
and the dealer portal is not built), so their contact person is kept on their record instead.

**Never paste a portal.** AutoTrader and Cars.co.za forbid copying their listings, and the desk
refuses them. The reader only ever reads a dealership's own site, with their permission.

---

## The stock sync

The live app reads every dealership's own website that has a feed switched on (Amico Motors was
the first) and keeps their cars on Rynet in step with it. Nobody has to run anything.

**What it does.** At most every three hours it reads each site's stock list and every listing page
on it, one dealership after another, never two at once. It adds cars that are new, updates the ones
that changed, and hides the ones that have gone. A car with no price, no mileage or no year, or
whose own details and title name different models, is kept hidden with the reason written on it.
Nothing is deleted and nothing is marked sold: only the dealership knows which it is.

**Where to look.** The admin home screen has a "Stock read from dealership websites" panel with
the last few runs in plain words, and a "Read them now" button. Each dealership's record has a
**Stock feed** tab with its website, the switch, and what its last read did. The full settings
are under Website settings, Stock sync, including a switch to stop everything.

**Spreadsheet uploads** run under the same lock as the timed reads, so the two never overlap. If an
upload says the reader is busy, upload it again in a few minutes.

**It only fetches public web addresses.** Every address it is given, and every redirect, is
checked against private and internal network ranges first (`src/lib/stock-import/address-guard.ts`).

**When the first real dealership's cars went live** the 311 example cars and 12 example
dealerships were hidden automatically. They are hidden, not deleted.

**If the host puts idle apps to sleep,** a sleeping app runs no timer. One cron job keeps it awake
and costs nothing:

```bash
*/10 * * * * curl -s -o /dev/null https://rynet.co.za/
```

**To stop it** without touching the database, set `RYNET_STOCK_SYNC=off` in Setup Node.js App and
restart. `RYNET_STOCK_SYNC_MINUTES` changes how often it runs.

**Running Amico's import from a terminal** is still possible on a machine with one, against that
machine's database: `npm run import:amico -- --dry-run` reads everything and writes nothing.

---

## Working on Windows, a trap worth knowing

Git stores this repository with Unix line endings and hands Windows a working copy with Windows
ones, which is normally invisible. Biome is the exception: it reads every carriage return as a
formatting error, so a local `npm run lint` can fill up with complaints that do not exist on the
build server, while real findings sit underneath them unseen. That is how eight genuine lint
errors once hid behind nineteen imaginary ones.

Two defences are in place. The lint command now prints up to two hundred findings rather than the
default twenty, so nothing real is pushed off the end. And if the carriage return noise is in the
way, rewrite the working copy to Unix endings before linting:

```
git ls-files | grep -E '\.(ts|tsx|css|json|md)$' | xargs sed -i 's/\r$//'
```

Git will not see that as a change, because it stores Unix endings either way.

---

## Routine jobs

| When | What | Why |
|---|---|---|
| Daily, 02:00 | `scripts/backup.sh` via cron | The only copy of everything |
| Whenever the SARB moves | Update the prime rate in Admin, Finance calculator defaults | Every instalment on the site is wrong until you do. 10.5% as at 28 May 2026 |
| Monthly | Check `~/backups/rynet/` actually has recent folders | A cron job that silently stopped looks exactly like one that is working |
| Quarterly | Run the restore drill | See above |
| Before a token expires | Renew the GitHub token in `~/.netrc` | A deploy that suddenly cannot authenticate is almost always this |

---

## Restore drills carried out

None yet. **This is the single most important outstanding item in this file.** Add a row the first
time you run one.

| Date | Who | Restored from | Time taken | Notes |
|---|---|---|---|---|
| | | | | |
