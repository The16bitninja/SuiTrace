/**
 * SuiTrace two-session demo agent.
 *
 * Session 1 (no history):  HOLD — insufficient trend data
 * Session 2 (reads Walrus): BUY  — consecutive rises confirm uptrend
 *
 * Prerequisites:
 *   SUITRACE_PACKAGE_ID=0x...   (from sui client publish)
 *   SUITRACE_REGISTRY_ID=0x...  (shared AgentRegistry object ID)
 *   AGENT_PRIVATE_KEY=<base64>  (sui keytool export --key-identity <addr> --json)
 *
 * Run:
 *   pnpm demo          # session 1 → HOLD
 *   pnpm demo          # session 2 → BUY  (reads session 1 from Walrus)
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { recordDecision, fetchDecisionChain, verifyChain } from "../sdk/src/trace";

// ── Setup ─────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Missing AGENT_PRIVATE_KEY env var.");
  console.error("Generate one:  sui keytool generate ed25519");
  console.error("Export it:     sui keytool export --key-identity <addr> --json");
  process.exit(1);
}
if (!process.env.SUITRACE_PACKAGE_ID || !process.env.SUITRACE_REGISTRY_ID) {
  console.error("Missing SUITRACE_PACKAGE_ID or SUITRACE_REGISTRY_ID env vars.");
  console.error("Deploy the contract first:  cd contracts && sui client publish --gas-budget 200000000");
  process.exit(1);
}

// Network is overridable so the same agent can run against a local node
// (SUI_RPC_URL=http://127.0.0.1:9000 SUI_NETWORK=localnet) or testnet (default).
const SUI_NETWORK  = (process.env.SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet" | "localnet";
const SUI_RPC_URL  = process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(SUI_NETWORK);
const suiClient    = new SuiJsonRpcClient({ url: SUI_RPC_URL, network: SUI_NETWORK });
const keypair      = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const agentAddress = keypair.toSuiAddress();

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     SuiTrace Demo Agent              ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Agent: ${agentAddress}\n`);

  // ── Fetch prior history from Walrus/Sui ──────────────────────────────────

  console.log("Fetching decision history from Walrus...");
  const chain = await fetchDecisionChain(suiClient, agentAddress);

  if (chain.length === 0) {
    console.log("  No prior history — this is a genesis run.\n");
  } else {
    console.log(`  Retrieved ${chain.length} prior decision(s):`);
    for (const e of chain) {
      const status = e.fetchFailed ? "UNREACHABLE" : e.hashMismatch ? "TAMPERED" : "✓";
      console.log(`  [seq=${e.seqNum}] ${status} certified_epoch=${e.certifiedEpoch} — "${e.summary}"`);
    }
    console.log();

    // Verify chain integrity before using history as context
    const verification = verifyChain(chain);
    if (verification.status === "FAIL") {
      console.error("⚠ Chain integrity FAILED — history may be tampered. Aborting.");
      process.exit(1);
    }
    if (verification.status === "UNREACHABLE") {
      console.warn("⚠ Some blobs unreachable — proceeding with partial history.");
    }
  }

  // ── Oracle data (simulated) ──────────────────────────────────────────────

  const oracle = {
    asset:       "SUI/USD",
    price:       chain.length === 0 ? 1.24 : 1.35,
    change_24h:  chain.length === 0 ? "+8%" : "+9%",
    source:      "pyth:SUI/USD",
    timestamp:   new Date().toISOString(),
  };

  // ── Decision logic: uses prior memory ────────────────────────────────────

  const priorDecisions = chain
    .filter(e => !e.fetchFailed && !e.hashMismatch && e.content)
    .map(e => ({ seq: e.seqNum, decision: e.content!.decision }));

  const context = { oracle, prior_decisions: priorDecisions };

  // The functional improvement: session 2 makes a different, better decision
  // because it has memory of session 1.
  let decision: string;
  if (priorDecisions.length === 0) {
    decision = "HOLD — insufficient trend data for confident entry";
  } else if (priorDecisions.every(d => d.decision.startsWith("HOLD"))) {
    decision = `BUY — ${priorDecisions.length + 1} consecutive rises confirm uptrend (memory-informed)`;
  } else {
    decision = "HOLD — mixed signals from prior decisions";
  }

  const seqNum    = chain.length;
  const prevEntry = chain[chain.length - 1] ?? null;

  console.log(`━━━ Decision [seq=${seqNum}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Context:  price=${oracle.price}, change=${oracle.change_24h}`);
  if (priorDecisions.length > 0) {
    console.log(`Memory:   ${priorDecisions.map(d => `seq=${d.seq}: "${d.decision}"`).join(", ")}`);
  }
  console.log(`Decision: ${decision}\n`);

  // ── Write to Walrus + Sui ────────────────────────────────────────────────

  console.log("Writing decision to Walrus + Sui...");
  const result = await recordDecision(suiClient, keypair, {
    agentAddress,
    seqNum,
    context,
    decision,
    summary:    decision.slice(0, 80),
    prevBlobId: prevEntry?.blobId    ?? null,
    prevHash:   prevEntry?.contentHash ?? null,
  });

  console.log(`\n✓ Done`);
  console.log(`  tx:             ${result.txDigest}`);
  console.log(`  blob_id:        ${result.blobId}`);
  console.log(`  seq_num:        ${result.seqNum}`);
  console.log(`  Blob URL:       https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.blobId}`);
  console.log(`  Sui explorer:   https://suiscan.xyz/testnet/tx/${result.txDigest}`);
  console.log();

  if (seqNum === 0) {
    console.log("Run again to see session 2 use this memory → BUY decision.");
  } else {
    console.log("Two-session demo complete. Open the UI to verify the chain.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
