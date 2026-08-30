#!/bin/bash
#
# Nightly backup, for cPanel cron.
#
# The entire state of Rynet is two things: rynet.db and media/. This copies both, dates
# them, and prunes anything older than the retention window.
#
# Set it up in cPanel, Cron Jobs, daily at 02:00:
#
#   /bin/bash /home/rynetco/rynet/scripts/backup.sh
#
# WHY sqlite3 .backup RATHER THAN cp
#
# Copying a live SQLite file with cp can capture it mid-write and produce a database that
# opens fine and is subtly corrupt, which is the worst kind. `.backup` takes a consistent
# snapshot while the app keeps running. If sqlite3 is not on the host this falls back to cp
# and says so loudly, because a warning you can see beats a silent downgrade.
#
# A BACKUP YOU HAVE NEVER RESTORED IS NOT A BACKUP. Do the drill in docs/RUNBOOK.md before
# there is data worth losing, not after.

set -euo pipefail

APP="${APP:-/home/rynetco/rynet}"
DEST="${DEST:-/home/rynetco/backups/rynet}"
KEEP_DAYS="${KEEP_DAYS:-30}"

STAMP="$(date -u '+%Y-%m-%d_%H%M')"
TARGET="$DEST/$STAMP"

mkdir -p "$TARGET"

# ------------------------------------------------------------------ database
if [ -f "$APP/rynet.db" ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$APP/rynet.db" ".backup '$TARGET/rynet.db'"
    echo "database: consistent snapshot via sqlite3"
  else
    # Not ideal. Recorded in the log rather than passed over in silence.
    cp "$APP/rynet.db" "$TARGET/rynet.db"
    echo "database: WARNING, sqlite3 not found, used cp. A copy taken mid-write can be"
    echo "          subtly corrupt. Ask the host to install sqlite3."
  fi
  gzip -9 "$TARGET/rynet.db"
else
  echo "database: NOT FOUND at $APP/rynet.db. Nothing backed up." >&2
  exit 1
fi

# --------------------------------------------------------------------- media
# Skipped once media moves to Cloudflare R2, which has its own durability. Until then these
# are the only copies of every photograph on the platform.
if [ -d "$APP/media" ] && [ -n "$(ls -A "$APP/media" 2>/dev/null)" ]; then
  tar -czf "$TARGET/media.tar.gz" -C "$APP" media
  echo "media: archived"
else
  echo "media: empty, nothing to archive"
fi

# ----------------------------------------------------------------- provenance
# So a restore can be traced to a deploy, and a backup that turns out to be broken can be
# matched to the release that produced it.
{
  echo "taken:  $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "host:   $(hostname)"
  [ -f "$APP/DEPLOYED.txt" ] && cat "$APP/DEPLOYED.txt"
} > "$TARGET/ABOUT.txt"

# ------------------------------------------------------------------- pruning
# Runs AFTER a successful backup, never before. Deleting the old copy first and then failing
# to write the new one is how a backup routine loses everything at once.
find "$DEST" -maxdepth 1 -type d -name '20*' -mtime "+$KEEP_DAYS" -exec rm -rf {} + 2>/dev/null || true

SIZE="$(du -sh "$TARGET" | cut -f1)"
COUNT="$(find "$DEST" -maxdepth 1 -type d -name '20*' | wc -l)"
echo "done: $TARGET ($SIZE). $COUNT backups retained, keeping $KEEP_DAYS days."
