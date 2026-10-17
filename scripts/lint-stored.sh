#!/usr/bin/env bash
# Lints exactly what git will commit, with Unix line endings, the way CI sees it.
#
# On Windows the working copy has Windows line endings, Biome reads every carriage return as a
# formatting error, and real findings drown in the noise (docs/RUNBOOK.md, "Working on Windows").
# This copies the staged files out with LF endings and lints the copy. Stage first: git add -A.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
copy="$(mktemp -d)"
trap 'rm -rf "$copy"' EXIT
git -C "$here" -c core.autocrlf=false -c core.eol=lf checkout-index -a -f --prefix="$copy/"
cd "$copy"
"$here/node_modules/.bin/biome" check --max-diagnostics=200 .
