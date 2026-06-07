#!/usr/bin/env bash
# Publish the SuiTrace contract to Sui testnet and write IDs into .env.
#
# Usage:  ./scripts/deploy.sh
# Requires: a funded testnet address (sui client gas must show a coin).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
ENV_FILE="$REPO_ROOT/.env"

# 1. Target testnet
echo "Switching to testnet environment..."
sui client switch --env testnet >/dev/null
ADDR=$(sui client active-address)
echo "  active address: $ADDR"

# 2. Gas preflight
if ! sui client gas --json 2>/dev/null | grep -q '"gasCoinId"'; then
  echo "" >&2
  echo "ERROR: no gas coins on $ADDR (testnet)." >&2
  echo "Fund it, then re-run:" >&2
  echo "  https://faucet.sui.io/?address=$ADDR" >&2
  exit 1
fi
echo "  gas: OK"

# 3. Publish and capture JSON output
echo "Publishing SuiTrace contract from $CONTRACTS_DIR ..."
OUT=$(cd "$CONTRACTS_DIR" && sui client publish --gas-budget 500000000 --json)

# Package ID: the published immutable package object
PACKAGE_ID=$(echo "$OUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')

# Registry ID: the shared AgentRegistry object created by init()
REGISTRY_ID=$(echo "$OUT" | jq -r '.objectChanges[]
  | select(.type=="created")
  | select(.objectType | test("::trace_log::AgentRegistry$"))
  | .objectId')

if [[ -z "$PACKAGE_ID" || -z "$REGISTRY_ID" || "$PACKAGE_ID" == "null" || "$REGISTRY_ID" == "null" ]]; then
  echo "ERROR: could not extract IDs from publish output." >&2
  echo "$OUT" | jq '.objectChanges' >&2
  exit 1
fi

echo "  PACKAGE_ID  = $PACKAGE_ID"
echo "  REGISTRY_ID = $REGISTRY_ID"

# 4. Upsert .env — set testnet IDs, drop any localnet overrides, keep AGENT_PRIVATE_KEY
touch "$ENV_FILE"
grep -v -E '^(SUITRACE_PACKAGE_ID|SUITRACE_REGISTRY_ID|SUI_RPC_URL|SUI_NETWORK)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
{
  echo "SUITRACE_PACKAGE_ID=$PACKAGE_ID"
  echo "SUITRACE_REGISTRY_ID=$REGISTRY_ID"
  cat "$ENV_FILE.tmp"
} > "$ENV_FILE"
rm -f "$ENV_FILE.tmp"

echo "Wrote testnet IDs to $ENV_FILE (localnet overrides removed)."
echo "Next: ensure AGENT_PRIVATE_KEY is set in .env, then 'pnpm demo' (x2)."
