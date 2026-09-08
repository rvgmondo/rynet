# Deploying

Push to `main`. That is the whole thing.

GitHub Actions builds, publishes the result to the `deploy` branch, and a cron job on the host
picks it up within five minutes, installs it atomically, restarts the app, checks the site
answers, and rolls itself back if it does not.

For the manual upload route, and for the host troubleshooting that applies either way, see
[DEPLOY-CPANEL.md](DEPLOY-CPANEL.md).

---

## Do not use cPanel's Git Version Control button

It is the wrong tool for this and it cost several sessions to be sure of that. Three separate
reasons, none fixable from inside cPanel:

- **It pulls with `--ff-only`.** The `deploy` branch carries a full build. Any history rewrite,
  and there have been several, makes a fast-forward impossible, and the button then either
  errors or silently redeploys whatever it already had.
- **The checked-out branch keeps reverting to `main`.** `main` has no build in it, deliberately,
  so deploying from there does nothing useful and once took the site down.
- **It is a ritual, not a deploy.** Update from Remote, then Deploy HEAD Commit, then Restart,
  and check the branch first.

`git reset --hard` cares about none of that. So the host stops asking cPanel.

The button is left wired up and harmless: `.cpanel.yml` now calls the same script, which refuses
before writing anything if the checkout has no build in it.

---

## How it fits together

```
you push to main
        |
        v
GitHub Actions builds  (Node 22, same as the host)
        |
        v
commits source + prebuilt .next to the `deploy` branch
        |
        v
cron on the host, every five minutes:
   git fetch && git reset --hard origin/deploy
   scripts/host-deploy.sh
        |
        v
   refuse if there is no build in the checkout
   stage beside the live app, swap by rename, keep the previous build
   touch tmp/restart.txt
   check the site answers, roll back if it does not
```

**The host cannot build.** Next 16 with Turbopack needs far more memory than a shared CloudLinux
account allows, and it gets killed rather than erroring usefully. That constraint shapes all of
this.

---

## One-time setup

You only do this once. Steps 1 and 2 are already done if you have deployed before.

### 1. Give the host read access to the private repository

Two routes fail on this class of host and it is worth knowing why before trying them:

- **SSH deploy keys do not work.** cPanel's Manage SSH Keys offers only RSA and DSA, and GitHub
  rejects RSA SHA-1 signatures. You get `Permission denied (publickey)` however correctly the key
  is installed.
- **Credentials in the clone URL are blocked.** cPanel refuses `https://user:token@github.com/...`
  with "The clone URL cannot include a password".

**What works:** a fine-grained personal access token, read-only, scoped to this one repository,
supplied through `~/.netrc` so the clone URL stays clean.

github.com, Settings, Developer settings, Personal access tokens, Fine-grained tokens:

- Repository access: **Only select repositories**, then `rvgmondo/rynet`
- Permissions: **Contents: Read-only**. Nothing else.
- Expiry: set a real one and put a reminder in your calendar. A deploy that suddenly cannot
  authenticate is almost always a lapsed token.

Then in the cPanel terminal:

```bash
printf 'machine github.com\nlogin rvgmondo\npassword YOUR_TOKEN_HERE\n' > ~/.netrc
chmod 600 ~/.netrc
```

`chmod 600` matters. Git ignores a `.netrc` that other users can read.

### 2. Have the repository on disk

If cPanel already cloned it, it is at `~/repositories/rynet` and there is nothing to do. If not:

```bash
git clone https://github.com/rvgmondo/rynet.git ~/repositories/rynet
```

### 3. Write the bootstrap script

This is the only file that lives on the host and never changes. Everything it calls ships with
the build, so deploy logic can be fixed by pushing.

```bash
cat > ~/deploy-rynet.sh <<'EOF'
#!/bin/bash
# Pulls the latest build and installs it. Safe to run at any time, from any branch state.
set -euo pipefail
REPO="$HOME/repositories/rynet"
cd "$REPO"
git fetch --quiet origin deploy
git reset --hard --quiet origin/deploy
exec bash "$REPO/scripts/host-deploy.sh" "$@"
EOF
chmod +x ~/deploy-rynet.sh
```

`reset --hard` is what makes this immune to everything above: it does not care which branch was
checked out or whether the history was rewritten.

### 4. Run it once, by hand, and watch it

```bash
~/deploy-rynet.sh
```

It prints what it is doing. It should end with `https://rynet.co.za answered 200`.

### 5. Put it on cron

cPanel, Advanced, **Cron Jobs**. Every five minutes:

```
*/5 * * * * /bin/bash /home/rynetco/deploy-rynet.sh >> /home/rynetco/deploy.log 2>&1
```

It exits in well under a second when the commit has not changed, so this is cheap. Set the cron
email to yours and you will hear about a failed deploy without watching for it.

That is the last time you touch the host for a deploy.

---

## Every deploy after that

```bash
git push
```

Wait roughly five minutes. Check `~/deploy.log`, or `~/rynet/DEPLOYED.txt`, which carries the
timestamp, the commit and the build id.

### The two steps that are still deliberately manual

**`npm install --omit=dev`**, only when dependencies changed. It takes minutes and a half-finished
one leaves the app unable to start, so it must not happen as a side effect of a content deploy.

**`npx payload migrate`**, only when the schema changed. It writes to the live database, so it
should be a decision. It also asks a confirmation question on a database that was ever created in
dev mode, which means it would hang forever inside a cron job.

Both from `~/rynet`, inside the virtual environment:

```bash
source $(ls -d ~/nodevenv/rynet/*/bin/activate | sort -V | tail -1)
cd ~/rynet && npm install --omit=dev     # only if dependencies changed
cd ~/rynet && npx payload migrate        # only if the schema changed
```

Use `npx` rather than `npm run`: on this host npm runs lifecycle scripts from the virtualenv's lib
directory rather than your app root, so anything with a relative path looks in the wrong place.
That is what broke the first install.

---

## When something goes wrong

**The deploy refuses.** Read the message. "No `.next/BUILD_ID` in the checkout" means the
repository is not on the `deploy` branch, which `~/deploy-rynet.sh` fixes by itself. Nothing was
written.

**The deploy rolled itself back.** The new build did not answer, so the previous one is live again
and the failed one is in `~/rynet/.next.failed`. Nothing is lost. The usual cause is a dependency
change that needs `npm install --omit=dev`, or a schema change that needs a migration.

**Roll back by hand**, in seconds:

```bash
cd ~/rynet && rm -rf .next.bad && mv .next .next.bad && mv .next.previous .next
touch tmp/restart.txt
```

Do the same for `src.previous` and `scripts.previous` if the bad deploy changed them.

**Roll back properly**, through the pipeline. Revert on `main` and let it rebuild:

```bash
git revert <bad-commit>
git push
```

A revert is safer than a reset here, because the deploy branch is derived from whatever `main`
currently says. **A rollback does not undo a migration.** If the bad deploy included a schema
change, restore `rynet.db` from backup as well, which is the argument for having one.

---

## What is never overwritten

The install copies named paths rather than the whole tree, so adding something to the repository
cannot silently start overwriting live state.

| Path | Why |
|---|---|
| `rynet.db` | The database. Every dealership, listing and lead. |
| `media/` | Uploaded photography. |
| `.env` | If one exists. Environment belongs in Setup Node.js App. |
| `node_modules/` | Installed on the host, with the host's own native binaries. |

Proven rather than asserted: the install script's test matrix includes a rollback and a failed
copy, and checks the database and a photograph are still there afterwards.

---

## Changing the domain

`NEXT_PUBLIC_SERVER_URL` is inlined at build time, so it has to be right when GitHub Actions
builds and cannot be corrected on the server afterwards.

Set a repository variable rather than editing the workflow: github.com/rvgmondo/rynet, Settings,
Secrets and variables, Actions, Variables, add `SITE_URL` with the origin and no trailing slash.
The next build picks it up.

To rebuild without pushing a code change: Actions, Build deploy branch, Run workflow.

---

## About the `deploy` branch growing

Every build commits a full `.next`, so the branch grows by roughly the size of a build per push.
When it becomes a nuisance, delete the branch on GitHub, let the next build recreate it, and the
host will pick it up on its own: `reset --hard` does not need the history to line up.
