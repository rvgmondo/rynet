#!/bin/bash
#
# Deploy from inside cPanel's Git Version Control, from whichever branch is checked out.
#
# WHY THIS EXISTS
#
# The host's clone was sitting on `main` at the latest commit, and `main` has no build in it by
# design, so "Deploy HEAD Commit" had nothing to install and the site stayed on a build from
# 3 September. The checked-out branch drifting back to `main` is a known cPanel behaviour and
# several sessions went into fighting it. This stops fighting it.
#
# Nothing here reads the working tree. It fetches the `deploy` branch, unpacks that commit into
# a staging directory with `git archive`, and installs from there. So it does not matter which
# branch is checked out, it does not switch branches, it does not touch the index, and
# "Update from Remote" pulling `main` with --ff-only is fine because `main` is never rewritten.
#
# WHAT THE BUTTONS DO NOW
#
#   Update from Remote  ->  brings this script and .cpanel.yml up to date on the host
#   Deploy HEAD Commit  ->  runs this, which installs the latest BUILD
#
# Two clicks, in that order, every time. No branch to check and nothing to restart by hand:
# host-deploy.sh touches tmp/restart.txt itself.
#
# It is also exactly what cron should run, and what `~/deploy-rynet.sh` can be reduced to:
#
#   */5 * * * * /bin/bash $HOME/repositories/rynet/scripts/cpanel-deploy.sh >> $HOME/deploy.log 2>&1
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="${RYNET_APP:-$HOME/rynet}"
STAGE="${RYNET_STAGE:-$HOME/rynet-incoming}"
BRANCH="${RYNET_DEPLOY_BRANCH:-deploy}"

say() { printf '%s  %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { say "FAILED: $*"; exit 1; }

say "repo   $REPO"
say "stage  $STAGE"
say "branch $BRANCH"

cd "$REPO" || die "cannot enter $REPO"
[ -d .git ] || die "$REPO is not a git checkout"

# --------------------------------------------------------------------------- fetch
#
# `--depth=1`, because the deploy branch carries a full build in every commit and a full fetch
# would pull ninety megabytes per deploy that has ever happened onto a shared account with a
# disk quota. `--no-tags` for the same reason. FETCH_HEAD rather than a remote-tracking ref, so
# this works whether or not the ref exists and whether or not the clone is shallow.
say "fetching origin/$BRANCH"
# The shallow fetch is the one that matters, and it is also the one with a failure mode: a
# clone made in full becomes shallow for these objects, and some git versions refuse the mix.
# A full fetch of a branch carrying a build in every commit is expensive, but it works
# everywhere, so it is the fallback rather than the default.
if ! git fetch --no-tags --depth=1 origin "$BRANCH"; then
  say "shallow fetch refused, falling back to a full one"
  git fetch --no-tags origin "$BRANCH" \
    || die "could not fetch origin/$BRANCH. If this is a credentials error, cPanel's Git Version Control is what holds them: open the repository there once and let it update from remote."
fi

INCOMING="$(git rev-parse --short FETCH_HEAD)"
say "fetched $INCOMING"

# --------------------------------------------------------------------------- skip a no-op
#
# Before unpacking ninety megabytes. host-deploy.sh writes the installed commit as the second
# line of DEPLOYED.txt, so this is the same check it makes, made early enough to be worth
# making: it is what lets the cron line run every five minutes for nothing, and what makes
# pressing the button twice harmless.
CURRENT="$(sed -n '2p' "$APP/DEPLOYED.txt" 2>/dev/null || true)"
if [ "${1:-}" != "--force" ] && [ -n "$CURRENT" ] && [ "$CURRENT" = "$INCOMING" ]; then
  say "already on $INCOMING, nothing to do"
  exit 0
fi
say "installing $INCOMING (was ${CURRENT:-nothing})"

# --------------------------------------------------------------------------- unpack
#
# `git archive` writes a tree straight out of the object database. It does not switch branches,
# does not write the index, and leaves the working tree exactly as cPanel left it, which is the
# whole reason the checked-out branch stops mattering.
rm -rf "$STAGE"
mkdir -p "$STAGE"

# The staging copy is another ninety megabytes, and shared hosting counts inodes long before it
# counts disk. A trap rather than a line at the end, so a failure half way through does not
# leave it behind.
trap 'rm -rf "$STAGE"' EXIT

say "unpacking $INCOMING into $STAGE"
git archive FETCH_HEAD | tar -x -C "$STAGE"

[ -s "$STAGE/.next/BUILD_ID" ] \
  || die "origin/$BRANCH has no .next/BUILD_ID in it, so it carries no build. Nothing has been changed. Check the 'Build deploy branch' workflow on GitHub."

say "unpacked $(find "$STAGE/.next" -type f | wc -l) files under .next"

# --------------------------------------------------------------------------- install
#
# host-deploy.sh is the thing that knows how to do this, and it is unchanged: it refuses a tree
# with no build in it, stages beside the live app and swaps by rename, keeps the previous build
# so a rollback is one rename, restarts through tmp/restart.txt, health-checks the site, and
# rolls itself back if the site stops answering.
#
# --force because the staging directory is new every time, so host-deploy.sh's own
# already-on-this-commit check has nothing to compare against. The guard against a pointless
# deploy is the DEPLOYED.txt check above, which runs before anything is unpacked.
export RYNET_REPO="$STAGE"
export RYNET_SHA="$INCOMING"

say "installing"
bash "$STAGE/scripts/host-deploy.sh" --force

say "done, $INCOMING is installed"
