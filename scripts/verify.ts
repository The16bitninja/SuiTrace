/**
 * SuiTrace CLI chain verifier.
 *
 * Exercises the exact data path the web UI uses:
 *   fetchDecisionChain(client, address, REGISTRY_ID)  →  verifyChain(chain)
 *
 * Usage:
 *   tsx scripts/verify.ts <agentAddress>
 *
 * Env:
 *   SUITRACE_REGISTRY_ID   shared AgentRegistry object id (required)
 *   SUI_RPC_URL            RPC url (default: testnet fullnode)
 *   SUI_NETWORK            testnet | mainnet | devnet | localnet (default: testnet)
 *
 * Exit code: 0 on PASS, 1 on FAIL or UNREACHABLE.
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { fetchDecisionChain, verifyChain } from "../sdk/src/trace";

async function main() {
  const address = process.argv[2] ?? process.env.AGENT_ADDRESS;
  if (!address) {
    console.error("usage: tsx scripts/verify.ts <agentAddress>");
    process.exit(1);
  }

  const network = (process.env.SUI_NETWORK ?? "testnet") as
    | "testnet" | "mainnet" | "devnet" | "localnet";
  const url = process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(network);
  const registryId = process.env.SUITRACE_REGISTRY_ID ?? "";

  const client = new SuiJsonRpcClient({ url, network });

  console.log(`\nVerifying ${address}`);
  console.log(`  network=${network} registry=${registryId || "(unset)"}\n`);

  const chain = await fetchDecisionChain(client, address, registryId);

  if (chain.length === 0) {
    console.log("No decisions on record for this agent.");
    process.exit(0);
  }

  for (const e of chain) {
    const status = e.hashMismatch ? "✗ TAMPERED" : e.fetchFailed ? "○ UNAVAILABLE" : "✓ VERIFIED";
    console.log(
      `  [seq=${e.seqNum}] ${status}  cert epoch ${e.certifiedEpoch}→${e.endEpoch}  blob=${e.blobId.slice(0, 16)}…`,
    );
    console.log(`            "${e.summary}"`);
    if (e.content) {
      console.log(`            decision: "${e.content.decision}"`);
    }
  }

  const result = verifyChain(chain);
  console.log(`\nCHAIN INTEGRITY: ${result.status}`);
  for (const d of result.details.filter((x) => x.status !== "PASS")) {
    console.log(`  seq ${d.seqNum}: ${d.status} — ${d.reason}`);
  }
  console.log();

  process.exit(result.status === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
