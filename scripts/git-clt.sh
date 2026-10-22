#!/usr/bin/env bash
# Use Apple Command Line Tools git (Homebrew git 2.49 may crash on this Mac).
# Usage: ./scripts/git-clt.sh push origin main
CLT_GIT="/Library/Developer/CommandLineTools/usr/bin/git"
if [[ ! -x "$CLT_GIT" ]]; then
  echo "Apple CLT git not found. Install: xcode-select --install" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$CLT_GIT" -C "$ROOT" "$@"
