#!/usr/bin/env bash
# Publish the SuiTrace contract to testnet and write IDs into .env.
#
# Usage:  ./scripts/deploy.sh
# Requires: funded active address (sui client gas must show a coin).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
ENV_FILE="$REPO_ROOT/.env"

echo "Publishing SuiTrace contract from $CONTRACTS_DIR ..."

# Publish and capture JSON output
OUT=$(cd "$CONTRACTS_DIR" && sui client publish --gas-budget 200000000 --json)

# Package ID: the published immutable package object
PACKAGE_ID=$(echo "$OUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')

# Registry ID: the shared AgentRegistry object created by init()
REGISTRY_ID=$(echo "$OUT" | jq -r '.objectChanges[]
  | select(.type=="created")
  | select(.objectType | test("::trace_log::AgentRegistry$"))
  | .objectId')

if [[ -z "$PACKAGE_ID" || -z "$REGISTRY_ID" ]]; then
  echo "ERROR: could not extract IDs from publish output." >&2
  echo "$OUT" | jq '.objectChanges' >&2
  exit 1
fi

echo "  PACKAGE_ID  = $PACKAGE_ID"
echo "  REGISTRY_ID = $REGISTRY_ID"

# Upsert into .env (preserve AGENT_PRIVATE_KEY if present)
touch "$ENV_FILE"
grep -v -E '^(SUITRACE_PACKAGE_ID|SUITRACE_REGISTRY_ID)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
{
  echo "SUITRACE_PACKAGE_ID=$PACKAGE_ID"
  echo "SUITRACE_REGISTRY_ID=$REGISTRY_ID"
  cat "$ENV_FILE.tmp"
} > "$ENV_FILE"
rm -f "$ENV_FILE.tmp"

echo "Wrote IDs to $ENV_FILE"
echo "Done. Next: set AGENT_PRIVATE_KEY in .env, then run 'pnpm demo'."
