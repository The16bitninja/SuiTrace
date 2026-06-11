/**
 * Seed a BUSY multi-agent provenance network on Sui testnet.
 *
 * Six agents, each with multiple decisions, referencing each other's artifacts
 * via real `derived_from` links, so the provenance graph looks like a network:
 *
 *   PriceOracle ─┐                 ┌─► Risk ─┐
 *   Sentiment  ──┴► Research ─► Strategy ────┴► Execution
 *
 * Funds all agents from the deployer (AGENT_PRIVATE_KEY) in one PTB, then records
 * every decision in topological order so each derived_from points at a real,
 * already-anchored blob. Prints all agent addresses; view the EXECUTION agent to
 * see the whole network (the page walks derived_from outward).
 *
 * Run (repo root, env loaded):
 *   set -a; . ./.env; set +a
 *   tsx scripts/seed-network.ts
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

type AgentId = "PO" | "SO" | "RE" | "ST" | "RI" | "EX";
type Ref = { agent: AgentId; label: string };

async function main() {
  if (!process.env.AGENT_PRIVATE_KEY || !process.env.SUITRACE_PACKAGE_ID || !process.env.SUITRACE_REGISTRY_ID) {
    console.error("Missing env. Run: set -a; . ./.env; set +a");
    process.exit(1);
  }

  const client = new SuiJsonRpcClient({ url: URL, network: NETWORK });
  const deployer = Ed25519Keypair.fromSecretKey(process.env.AGENT_PRIVATE_KEY!);

  const keys: Record<AgentId, Ed25519Keypair> = {
    PO: Ed25519Keypair.generate(),
    SO: Ed25519Keypair.generate(),
    RE: Ed25519Keypair.generate(),
    ST: Ed25519Keypair.generate(),
    RI: Ed25519Keypair.generate(),
    EX: Ed25519Keypair.generate(),
  };
  const addr = Object.fromEntries(
    (Object.keys(keys) as AgentId[]).map((k) => [k, keys[k].toSuiAddress()]),
  ) as Record<AgentId, string>;

  const NAMES: Record<AgentId, string> = {
    PO: "PriceOracle", SO: "SentimentOracle", RE: "Research",
    ST: "Strategy", RI: "Risk", EX: "Execution",
  };

  console.log("Agents:");
  for (const k of Object.keys(keys) as AgentId[]) console.log(`  ${NAMES[k].padEnd(16)} ${addr[k]}`);
  console.log();

  // 1. Fund every agent from the deployer in a single PTB.
  console.log("Funding 6 agents (0.03 SUI each)...");
  const AMT = 30_000_000;
  const tx = new Transaction();
  const ids = Object.keys(keys) as AgentId[];
  const coins = tx.splitCoins(tx.gas, ids.map(() => AMT));
  ids.forEach((k, i) => tx.transferObjects([coins[i]], addr[k]));
  const fund = await client.signAndExecuteTransaction({ transaction: tx, signer: deployer, options: { showEffects: true } });
  await client.waitForTransaction({ digest: fund.digest });
  console.log(`  funded (tx ${fund.digest})\n`);

  // 2. Record decisions in topological order.
  const rec: Record<string, { blobId: string; contentHash: Uint8Array }> = {};

  async function record(
    agent: AgentId, label: string, seqNum: number,
    decision: string, summary: string, context: unknown,
    prevLabel: string | null, derived: Ref[],
  ) {
    const prev = prevLabel ? rec[prevLabel] : null;
    const r = await recordDecision(client, keys[agent], {
      agentAddress: addr[agent], seqNum, context, decision, summary,
      prevBlobId: prev?.blobId ?? null,
      prevHash:   prev?.contentHash ?? null,
      derivedFrom: derived.length
        ? derived.map((d) => ({ agent: addr[d.agent], blob_id: rec[d.label].blobId, content_hash: hex(rec[d.label].contentHash) }))
        : undefined,
    });
    rec[label] = { blobId: r.blobId, contentHash: r.contentHash };
    const tag = derived.length ? ` ⟵ ${derived.map((d) => d.label).join(", ")}` : "";
    console.log(`  ${NAMES[agent]} #${seqNum}: "${summary}"${tag}`);
  }

  console.log("Recording decisions...");
  // Oracles (genesis)
  await record("PO", "po0", 0, "SUI/USD 1.24 (+8% 24h)", "Price feed: SUI 1.24 +8%",
    { source: "pyth:SUI/USD", price: 1.24, change_24h: "+8%" }, null, []);
  await record("SO", "so0", 0, "Social sentiment bullish (0.72)", "Sentiment: bullish 0.72",
    { source: "twitter+farcaster", score: 0.72 }, null, []);
  await record("PO", "po1", 1, "SUI/USD 1.35 (+9% 24h)", "Price feed: SUI 1.35 +9%",
    { source: "pyth:SUI/USD", price: 1.35, change_24h: "+9%" }, "po0", []);
  await record("SO", "so1", 1, "Social sentiment very bullish (0.81)", "Sentiment: very bullish 0.81",
    { source: "twitter+farcaster", score: 0.81 }, "so0", []);

  // Research derives from both oracles
  await record("RE", "re0", 0, "Momentum positive across feeds", "Momentum positive",
    { thesis: "price up + sentiment up" }, null, [{ agent: "PO", label: "po0" }, { agent: "SO", label: "so0" }]);
  await record("RE", "re1", 1, "Uptrend confirmed (2 feeds agree)", "Uptrend confirmed",
    { thesis: "second confirmation" }, "re0", [{ agent: "PO", label: "po1" }, { agent: "SO", label: "so1" }]);

  // Strategy derives from research
  await record("ST", "st0", 0, "Plan: accumulate SUI", "Accumulate SUI",
    { plan: "scale in" }, null, [{ agent: "RE", label: "re0" }]);
  await record("ST", "st1", 1, "Plan: BUY 10% allocation", "BUY 10% allocation",
    { plan: "target 10%" }, "st0", [{ agent: "RE", label: "re1" }]);

  // Risk derives from strategy + live price
  await record("RI", "ri0", 0, "Risk check: within VaR limits", "Risk OK: within limits",
    { var_pct: 3.1, limit_pct: 5 }, null, [{ agent: "ST", label: "st1" }, { agent: "PO", label: "po1" }]);

  // Execution derives from strategy (first half) then strategy + risk (second half)
  await record("EX", "ex0", 0, "Executed BUY 5%", "Executed BUY 5%",
    { filled_pct: 5, venue: "DEX" }, null, [{ agent: "ST", label: "st0" }]);
  await record("EX", "ex1", 1, "Executed remaining 5% (risk-cleared)", "Executed BUY 5% more",
    { filled_pct: 5, venue: "DEX" }, "ex0", [{ agent: "ST", label: "st1" }, { agent: "RI", label: "ri0" }]);

  console.log("\n=== Network seeded on testnet ===");
  console.log("View the whole network at the EXECUTION agent:");
  console.log(`  /${addr.EX}\n`);
  console.log("Addresses:");
  for (const k of Object.keys(keys) as AgentId[]) console.log(`  ${NAMES[k]}=${addr[k]}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
