#!/usr/bin/env bash
# Phase 4.5 fix loop: build, lint, unit + integration tests, sync fixture to dev vault.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="${ABC_BLOCKS_DEV_VAULT:-$HOME/Desktop/Ideas/Obsidian Dev Vault}"

cd "$REPO"

ABC_BLOCKS_DEV_VAULT="$VAULT" npm run cycle:phase-4.5

echo ""
echo "Done. Reload Obsidian (dev vault) without saving, open Test.md in Live Preview."
echo "Vault: $VAULT"
