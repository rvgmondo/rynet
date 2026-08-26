# Deploying by git pull

The push-and-pull workflow. Set this up once, then every deploy is: push to `main`, wait for the
build, click two buttons in cPanel, Restart.

For the manual upload route, see [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md). You still want to read its
troubleshooting section, because the same things go wrong either way.

---

## How it fits together

```
you push to main
        |
        v
GitHub Actions builds  (Node 22, same as the host)
        |
        v
force-pushes source + prebuilt .next to the `deploy` branch
        |
        v
cPanel Git Version Control pulls `deploy`
        |
        v
.cpanel.yml copies files into ~/rynet
        |
        v
you click Restart
```

`main` holds source and no build output, so its history stays readable. `deploy` is an artefact:
rebuilt as a fresh orphan commit every time, so it never grows by a full build per push.

**The host cannot build.** Next 16 with Turbopack needs far more memory than a shared CloudLinux
account allows, and it gets killed rather than erroring usefully. That constraint is what shapes
all of this.

---

## One-time setup

### 1. Give cPanel read access to the private repository

The repository is private, so cPanel needs credentials. Two routes fail on this class of host and
it is worth knowing why before you try them:

- **SSH deploy keys do not work.** cPanel's Manage SSH Keys offers only RSA and DSA, and GitHub
  rejects RSA SHA-1 signatures. You get `Permission denied (publickey)` no matter how correctly the
  key is installed.
- **Credentials in the clone URL are blocked.** cPanel refuses `https://user:token@github.com/...`
  with "The clone URL cannot include a password".

**What works:** a fine-grained personal access token, read-only, scoped to this one repository,
supplied through a `~/.netrc` file so the clone URL stays clean.

Create the token at **github.com, Settings, Developer settings, Personal access tokens,
Fine-grained tokens**:

- Repository access: **Only select repositories**, then `rvgmondo/rynet`
- Permissions: **Contents: Read-only**. Nothing else.
- Expiry: set a real one and put a reminder in your calendar. A deploy that suddenly fails to
  authenticate is almost always a lapsed token.

Then, in the cPanel terminal:

```bash
printf 'machine github.com\nlogin rvgmondo\npassword YOUR_TOKEN_HERE\n' > ~/.netrc
chmod 600 ~/.netrc
```

`chmod 600` matters. Git ignores a `.netrc` that other users can read.

### 2. Create the repository in cPanel

**cPanel, Git Version Control, Create**:

| Field | Value |
|---|---|
| Clone a Repository | On |
| Clone URL | `https://github.com/rvgmondo/rynet.git` |
| Repository Path | `/home/rynetco/repositories/rynet` |
| Repository Name | `rynet` |

Save. It clones `main` by default.

### 3. Switch it to the deploy branch

`main` has no `.next` in it, so deploying `main` would put source on the server with nothing to
run. In the cPanel terminal:

```bash
cd ~/repositories/rynet
git fetch origin deploy
git checkout deploy
```

Confirm you are on the right branch and that the build is actually there:

```bash
git branch --show-current   # deploy
ls .next/BUILD_ID           # exists
```

### 4. Make sure the app root is set up

The application itself lives at `~/rynet`, separate from the repository checkout. If you already
did the manual deploy, it is there. If not:

```bash
mkdir -p ~/rynet/media
```

`~/rynet` needs `rynet.db` before the site can serve anything. Upload the seeded one from
`deploy/rynet-deploy.tar.gz`, or create it on the host:

```bash
cd ~/rynet && npx payload migrate && npm run seed:admin && npm run seed
```

The seed takes a few minutes and is memory-hungry. Uploading the prepared file is easier.

---

## Every deploy after that

1. **Push to `main`.** From your PC:
   ```bash
   git push
   ```
2. **Wait for the build.** Roughly 90 seconds. Watch it at
   github.com/rvgmondo/rynet/actions, or:
   ```bash
   gh run watch
   ```
   If it fails, nothing reaches the server. That is the point.
3. **cPanel, Git Version Control, Manage:** click **Update from Remote**, then
   **Deploy HEAD Commit**.
4. **Restart** on the Setup Node.js App screen.

Check `~/rynet/DEPLOYED.txt` afterwards. It carries the timestamp and the commit, so you can always
tell exactly what is running.

### Two steps that are deliberately not automatic

**`npm install --omit=dev`**, only when dependencies changed. It takes minutes and a half-finished
one leaves the app unable to start, so it should not happen as a side effect of a content deploy.

**`npx payload migrate`**, only when the schema changed. It writes to the live database. That
should always be a decision.

Both from `~/rynet`, inside the virtual environment. Use `npx` rather than `npm run`: on this host
npm runs lifecycle scripts from the virtualenv's lib directory rather than your app root, so
anything with a relative path in it looks in the wrong place. That is what broke the first install.

---

## What never gets overwritten

`.cpanel.yml` copies file by file rather than `cp -R .`, so adding something to the repository
cannot silently start overwriting live state. Three things are never touched:

| Path | Why |
|---|---|
| `rynet.db` | The database. Every dealership, listing and lead. |
| `media/` | Uploaded photography. |
| `.env` | If one exists. Environment belongs in Setup Node.js App. |

## Changing the domain

`NEXT_PUBLIC_SERVER_URL` is inlined at build time, so it has to be right when GitHub Actions
builds, and cannot be corrected on the server afterwards.

Set a repository variable rather than editing the workflow: **github.com/rvgmondo/rynet, Settings,
Secrets and variables, Actions, Variables**, add `SITE_URL` with the origin, no trailing slash.
The next build picks it up.

To rebuild without pushing a code change: **Actions, Build deploy branch, Run workflow**, and give
it an origin.

## Rolling back

The `deploy` branch is replaced wholesale each build, so there is no history there to roll back to.
Roll back on `main` instead and let it rebuild:

```bash
git revert <bad-commit>
git push
```

Then Update from Remote, Deploy HEAD Commit, Restart. A revert is safer than a reset here, because
the deploy branch is derived from whatever `main` currently says.

**A rollback does not undo a migration.** If the bad deploy included a schema change, restore
`rynet.db` from backup as well. Which is the argument for having one.
