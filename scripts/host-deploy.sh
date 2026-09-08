#!/bin/bash
#
# Installs a built Rynet onto the cPanel host.
#
# WHY THIS EXISTS, AND WHY THE cPANEL BUTTON DOES NOT
#
# cPanel's Git Version Control was the wrong tool for this job and cost several sessions
# proving it. Three things, none of which can be fixed from inside cPanel:
#
#   1. "Update from Remote" pulls with --ff-only. The deploy branch carries a full build, so
#      it is rewritten constantly, and any history rewrite makes a fast-forward impossible.
#   2. The checked-out branch keeps coming back as `main`. `main` deliberately has no build in
#      it, so deploying from there is at best a no-op and was once an outage.
#   3. It needs somebody to click two buttons, notice which branch is checked out, and then
#      click Restart. That is not a deploy, it is a ritual.
#
# So the host stops asking cPanel. `git reset --hard` does not care about fast-forwards or
# which branch was checked out, and cron does not need reminding. Run this from
# ~/deploy-rynet.sh, which fetches first. See DEPLOY-GIT.md.
#
# WHAT IT GUARANTEES
#
#   Nothing is deleted before its replacement is on disk and verified.
#   A checkout with no build in it is refused, loudly, before any write.
#   The previous build stays on disk, so a rollback is one rename.
#   If the site does not answer afterwards, it rolls itself back.
#   Running it twice in a row does nothing the second time.
#
# Usage:
#   bash scripts/host-deploy.sh            # deploy if the commit changed
#   bash scripts/host-deploy.sh --force    # deploy even if it did not
#
set -euo pipefail

APP="${RYNET_APP:-$HOME/rynet}"
REPO="${RYNET_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SITE="${RYNET_SITE_URL:-https://rynet.co.za}"
FORCE="${1:-}"

say() { printf '%s  %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { say "REFUSING: $*"; exit 1; }

say "repo $REPO"
say "app  $APP"

# ---------------------------------------------------------------- refuse before writing
#
# Every check here runs before the first byte is written. A deploy that cannot work should
# cost nothing, not leave a half-replaced application behind.

[ -s "$REPO/.next/BUILD_ID" ] || die "no .next/BUILD_ID in the checkout. That branch has no build in it, which almost always means it is on main instead of deploy. Nothing has been changed."
[ -s "$REPO/.next/runtime-links.json" ] || die "no .next/runtime-links.json, so sharp and the SQLite client would not resolve at runtime. Nothing has been changed."
[ -s "$REPO/server.cjs" ] || die "server.cjs is missing from the checkout. Nothing has been changed."
[ -d "$REPO/src" ] || die "src/ is missing from the checkout. Nothing has been changed."
[ -s "$REPO/scripts/link-runtime-deps.cjs" ] || die "scripts/link-runtime-deps.cjs is missing, and server.cjs requires it at boot. Nothing has been changed."

INCOMING_SHA="$(cd "$REPO" && git rev-parse --short HEAD 2>/dev/null || echo unknown)"
CURRENT_SHA="$(sed -n '2p' "$APP/DEPLOYED.txt" 2>/dev/null || true)"

if [ "$FORCE" != "--force" ] && [ -n "$CURRENT_SHA" ] && [ "$CURRENT_SHA" = "$INCOMING_SHA" ]; then
  say "already on $INCOMING_SHA, nothing to do"
  exit 0
fi

say "deploying $INCOMING_SHA (was ${CURRENT_SHA:-nothing})"
mkdir -p "$APP"

# ------------------------------------------------------------------- stage, then swap
#
# The build is roughly 90MB across 1100 files. Copying it straight over the live directory
# serves a half-replaced application for the length of the copy; deleting first serves
# nothing at all. Staging beside it and renaming closes that window to three renames.

rm -rf "$APP/.next.incoming" "$APP/src.incoming" "$APP/scripts.incoming"
cp -R "$REPO/.next" "$APP/.next.incoming"
cp -R "$REPO/src" "$APP/src.incoming"
cp -R "$REPO/scripts" "$APP/scripts.incoming"

# The copy itself can fail part way on a full disk or an inode limit, both of which are real
# on shared hosting. Verify what landed rather than what was sent.
[ -s "$APP/.next.incoming/BUILD_ID" ] || die "the staged build is incomplete, most likely a disk or inode quota. The live site has NOT been touched."
[ -s "$APP/scripts.incoming/link-runtime-deps.cjs" ] || die "staged scripts are incomplete. The live site has NOT been touched."

# Written as `if` blocks rather than `[ test ] && command`, on purpose. Under `set -e` a
# false test in an && list can abort the script, so on a first deploy, where none of these
# directories exist yet, the terse form is a coin flip on bash's exemption rules. This script
# exists to not break a live site; it should not depend on that.
rm -rf "$APP/.next.previous" "$APP/src.previous" "$APP/scripts.previous"
if [ -d "$APP/.next" ]; then mv "$APP/.next" "$APP/.next.previous"; fi
if [ -d "$APP/src" ]; then mv "$APP/src" "$APP/src.previous"; fi
if [ -d "$APP/scripts" ]; then mv "$APP/scripts" "$APP/scripts.previous"; fi

mv "$APP/.next.incoming" "$APP/.next"
mv "$APP/src.incoming" "$APP/src"
mv "$APP/scripts.incoming" "$APP/scripts"

for file in server.cjs package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs; do
  if [ -f "$REPO/$file" ]; then cp "$REPO/$file" "$APP/"; fi
done
if [ -d "$REPO/public" ]; then cp -R "$REPO/public" "$APP/"; fi

# Uploads and the Passenger restart file. `-p` so an existing media directory with live
# photographs in it is left exactly alone.
mkdir -p "$APP/media" "$APP/tmp"

# A checkout can arrive with the execute bit set on things that should not have it.
# node_modules is pruned: it is 74 000 files, re-permissioning it every deploy is minutes of
# pointless work, and the LVE limiter can kill the process half way through.
find "$APP/.next" "$APP/src" "$APP/scripts" -type d -exec chmod 755 {} + 2>/dev/null || true
find "$APP/.next" "$APP/src" "$APP/scripts" -type f -exec chmod 644 {} + 2>/dev/null || true

{
  date -u "+%Y-%m-%d %H:%M UTC"
  echo "$INCOMING_SHA"
  cat "$REPO/.next/BUILD_ID"
} > "$APP/DEPLOYED.txt"

touch "$APP/tmp/restart.txt"
say "installed, Passenger asked to reload"

# ------------------------------------------------------------------------ health check
#
# The deploy is not finished when the files are in place, it is finished when the site
# answers. Without this, a build that cannot boot sits there returning 500 until somebody
# happens to look.

rollback() {
  say "ROLLING BACK to the previous build"

  if [ ! -d "$APP/.next.previous" ]; then
    say "no previous build on disk. The site is down and needs a manual deploy."
    exit 1
  fi

  rm -rf "$APP/.next.failed"
  mv "$APP/.next" "$APP/.next.failed"
  mv "$APP/.next.previous" "$APP/.next"

  if [ -d "$APP/src.previous" ]; then
    rm -rf "$APP/src"
    mv "$APP/src.previous" "$APP/src"
  fi
  if [ -d "$APP/scripts.previous" ]; then
    rm -rf "$APP/scripts"
    mv "$APP/scripts.previous" "$APP/scripts"
  fi

  echo "rolled back from $INCOMING_SHA" >> "$APP/DEPLOYED.txt"
  touch "$APP/tmp/restart.txt"
  say "rolled back. The failed build is in $APP/.next.failed"
  exit 1
}

if ! command -v curl > /dev/null 2>&1; then
  say "curl is not on this host, so the health check was skipped. Check $SITE yourself."
  exit 0
fi

for attempt in 1 2 3 4 5 6; do
  sleep 5
  # curl already prints 000 when it cannot connect, so the fallback only covers curl itself
  # failing to run. Appending another one produced "000000" in the log, which reads like a
  # status code nobody has ever seen.
  code="$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 20 "$SITE" 2>/dev/null)" || code=""
  code="${code:-000}"
  if [ "$code" = "200" ]; then
    say "$SITE answered 200. Deployed $INCOMING_SHA."
    exit 0
  fi
  say "attempt $attempt: $SITE answered $code"
done

say "the site did not come back after the deploy"

if [ "${RYNET_NO_ROLLBACK:-}" = "1" ]; then
  say "rollback disabled by RYNET_NO_ROLLBACK, leaving it as it is"
  exit 1
fi

rollback
