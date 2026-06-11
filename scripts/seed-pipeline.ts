/**
 * Seed a REAL multi-agent provenance pipeline on Sui testnet:
 *   Research → Strategy → Execution, three distinct agents, each recording a
 *   decision whose blob carries a `derived_from` reference to the prior agent's
 *   artifact. Funds the three fresh agents from the deployer (AGENT_PRIVATE_KEY).
 *
 * Run (from repo root, with .env loaded):
 *   set -a; . ./.env; set +a
 *   tsx scripts/seed-pipeline.ts
 *
 * Prints the three agent addresses. Point the UI's pipeline link at the
 * EXECUTION address: the page walks `derived_from` back to Strategy & Research.
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { recordDecision } from "../sdk/src/trace";

const NETWORK = (process.env.SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet" | "localnet";
const URL = process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(NETWORK);

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  if (!process.env.AGENT_PRIVATE_KEY || !process.env.SUITRACE_PACKAGE_ID || !process.env.SUITRACE_REGISTRY_ID) {
    console.error("Missing AGENT_PRIVATE_KEY / SUITRACE_PACKAGE_ID / SUITRACE_REGISTRY_ID. Run: set -a; . ./.env; set +a");
    process.exit(1);
  }

  const client = new SuiJsonRpcClient({ url: URL, network: NETWORK });
  const deployer = Ed25519Keypair.fromSecretKey(process.env.AGENT_PRIVATE_KEY!);

  // Three distinct agents.
  const research = Ed25519Keypair.generate();
  const strategy = Ed25519Keypair.generate();
  const execution = Ed25519Keypair.generate();
  const RES = research.toSuiAddress();
  const STR = strategy.toSuiAddress();
  const EXE = execution.toSuiAddress();

  console.log("Agents:");
  console.log(`  Research:  ${RES}`);
  console.log(`  Strategy:  ${STR}`);
  console.log(`  Execution: ${EXE}\n`);

  // 1. Fund the three agents from the deployer in one PTB (0.1 SUI each).
  console.log("Funding agents (0.1 SUI each) from deployer...");
  const AMT = 100_000_000;
  const tx = new Transaction();
  const [c1, c2, c3] = tx.splitCoins(tx.gas, [AMT, AMT, AMT]);
  tx.transferObjects([c1], RES);
  tx.transferObjects([c2], STR);
  tx.transferObjects([c3], EXE);
  const fund = await client.signAndExecuteTransaction({
    transaction: tx, signer: deployer, options: { showEffects: true },
  });
  await client.waitForTransaction({ digest: fund.digest });
  console.log(`  funded (tx ${fund.digest})\n`);

  // 2. Research records its finding (genesis, no derived_from).
  console.log("Research: recording finding...");
  const r1 = await recordDecision(client, research, {
    agentAddress: RES, seqNum: 0,
    context: { sources: ["pyth:SUI/USD", "pyth:BTC/USD", "twitter:sentiment"],
               analysis: "SUI +8%, BTC flat, sentiment bullish" },
    decision: "SUI momentum positive",
    summary: "SUI momentum positive",
    prevBlobId: null, prevHash: null,
  });
  console.log(`  res blob ${r1.blobId}\n`);

  // 3. Strategy derives from Research's artifact (use the returned hash, no re-fetch,
  //    which avoids dynamic-field indexing lag on the public fullnode).
  console.log("Strategy: recording allocation (derived from Research)...");
  const s1 = await recordDecision(client, strategy, {
    agentAddress: STR, seqNum: 0,
    context: { research_from: RES, rationale: "Act on research finding" },
    decision: "BUY 10% SUI: based on research",
    summary: "BUY 10% SUI allocation",
    prevBlobId: null, prevHash: null,
    derivedFrom: [{ agent: RES, blob_id: r1.blobId, content_hash: hex(r1.contentHash) }],
  });
  console.log(`  strat blob ${s1.blobId}\n`);

  // 4. Execution derives from Strategy's artifact.
  console.log("Execution: recording fill (derived from Strategy)...");
  const e1 = await recordDecision(client, execution, {
    agentAddress: EXE, seqNum: 0,
    context: { strategy_from: STR, venue: "DEX" },
    decision: "Executed BUY 10% SUI per strategy",
    summary: "Executed BUY 10% SUI",
    prevBlobId: null, prevHash: null,
    derivedFrom: [{ agent: STR, blob_id: s1.blobId, content_hash: hex(s1.contentHash) }],
  });
  console.log(`  exec blob ${e1.blobId}\n`);

  console.log("=== Pipeline seeded on testnet ===");
  console.log(`Point the UI pipeline link at the EXECUTION agent:`);
  console.log(`  /${EXE}`);
  console.log(`\nAddresses:`);
  console.log(`  RESEARCH=${RES}`);
  console.log(`  STRATEGY=${STR}`);
  console.log(`  EXECUTION=${EXE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
