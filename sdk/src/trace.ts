import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import type { Signer } from "@mysten/sui/cryptography";
import { sha256 } from "js-sha256";
import { uploadBlob, fetchBlob } from "./walrus";

const PACKAGE_ID  = process.env.SUITRACE_PACKAGE_ID ?? "";
const REGISTRY_ID = process.env.SUITRACE_REGISTRY_ID ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

// A verifiable pointer to another agent's artifact (multi-agent provenance).
// content_hash lets a verifier cross-check the ref against the target's on-chain record.
export interface DerivedRef {
  agent:        string;
  blob_id:      string;
  content_hash: string; // hex
}

export interface ContextBlob {
  agent:        string;
  seq_num:      number;
  timestamp_ms: number;
  context:      unknown;
  decision:     string;
  prev_blob_id: string | null;
  prev_hash:    string | null;
  derived_from?: DerivedRef[];
}

export interface ChainEntry {
  seqNum:         number;
  blobId:         string;
  contentHash:    Uint8Array;
  prevHash:       Uint8Array;
  certifiedEpoch: number;
  endEpoch:       number;
  summary:        string;
  content:        ContextBlob | null;
  fetchFailed:    boolean;   // network/404: CONTEXT UNAVAILABLE, never TAMPERED
  hashMismatch:   boolean;   // sha256 mismatch: TAMPERED
}

export type VerifyStatus = "PASS" | "FAIL" | "UNREACHABLE";

export interface VerifyResult {
  status:  VerifyStatus;
  details: Array<{ seqNum: number; status: VerifyStatus; reason: string }>;
}

// ── Pure: blob construction ───────────────────────────────────────────────────

export function buildContextBlob(
  agentAddress: string,
  seqNum:       number,
  context:      unknown,
  decision:     string,
  prevBlobId:   string | null,
  prevHash:     Uint8Array | null,
  derivedFrom?: DerivedRef[],
): { bytes: Uint8Array; hash: Uint8Array } {
  const blob: ContextBlob = {
    agent:        agentAddress,
    seq_num:      seqNum,
    timestamp_ms: Date.now(),
    context,
    decision,
    prev_blob_id: prevBlobId,
    prev_hash:    prevHash ? Buffer.from(prevHash).toString("hex") : null,
  };
  // Only attach when present so single-agent blobs stay unchanged.
  if (derivedFrom && derivedFrom.length > 0) {
    blob.derived_from = derivedFrom;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(blob, null, 2));
  const hash  = new Uint8Array(sha256.array(bytes));
  return { bytes, hash };
}

// ── Pure: chain verification ──────────────────────────────────────────────────

export function verifyChain(chain: ChainEntry[]): VerifyResult {
  const details = chain.map((e) => {
    if (e.fetchFailed)  return { seqNum: e.seqNum, status: "UNREACHABLE" as const, reason: "blob fetch failed: context unavailable" };
    if (e.hashMismatch) return { seqNum: e.seqNum, status: "FAIL"        as const, reason: `seq ${e.seqNum}: content_hash mismatch` };
    return               { seqNum: e.seqNum, status: "PASS"        as const, reason: "hash matches on-chain record" };
  });

  const hasFailure     = details.some((d) => d.status === "FAIL");
  const hasUnreachable = details.some((d) => d.status === "UNREACHABLE");

  return {
    status:  hasFailure ? "FAIL" : hasUnreachable ? "UNREACHABLE" : "PASS",
    details,
  };
}

// ── Write path ────────────────────────────────────────────────────────────────

export async function recordDecision(
  suiClient: SuiJsonRpcClient,
  signer:    Signer,
  params: {
    agentAddress: string;
    seqNum:       number;
    context:      unknown;
    decision:     string;
    summary:      string;
    prevBlobId:   string | null;
    prevHash:     Uint8Array | null;
    derivedFrom?: DerivedRef[]; // multi-agent provenance (optional)
  },
): Promise<{ txDigest: string; blobId: string; seqNum: number; contentHash: Uint8Array }> {
  const { bytes, hash } = buildContextBlob(
    params.agentAddress,
    params.seqNum,
    params.context,
    params.decision,
    params.prevBlobId,
    params.prevHash,
    params.derivedFrom,
  );

  // Step 1: upload to Walrus (off-chain HTTP)
  console.log(`  Uploading blob (~${bytes.length}B) to Walrus...`);
  const { blobId, certifiedEpoch, endEpoch } = await uploadBlob(bytes, 50);
  console.log(`  blob_id=${blobId} epoch=${certifiedEpoch}→${endEpoch}`);

  // Step 2: anchor on Sui via PTB (sequential after step 1, NOT atomic)
  const tx = new Transaction();
  tx.moveCall({
    target:    `${PACKAGE_ID}::trace_log::record_decision`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(blobId))),
      tx.pure.vector("u8", Array.from(hash)),
      tx.pure.vector("u8", Array.from(params.prevHash ?? new Uint8Array(32))),
      tx.pure.u64(params.seqNum),
      tx.pure.u64(certifiedEpoch),
      tx.pure.u64(endEpoch),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(params.summary))),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });

  if (result.effects?.status.status !== "success") {
    throw new Error(`PTB failed: ${JSON.stringify(result.effects?.status)}`);
  }

  return { txDigest: result.digest, blobId, seqNum: params.seqNum, contentHash: hash };
}

// ── Read path ─────────────────────────────────────────────────────────────────

export async function fetchDecisionChain(
  suiClient:    SuiJsonRpcClient,
  agentAddress: string,
  registryId:   string = REGISTRY_ID,
): Promise<ChainEntry[]> {
  // Not deployed yet (no registry configured) → empty history, not an error.
  if (!registryId) return [];

  // Read registry object to get the heads and history table IDs
  let registry;
  try {
    registry = await suiClient.getObject({
      id:      registryId,
      options: { showContent: true },
    });
  } catch {
    return [];
  }

  const regFields  = (registry.data?.content as any)?.fields;
  const headsId    = regFields?.heads?.fields?.id?.id as string | undefined;
  const historyId  = regFields?.history?.fields?.id?.id as string | undefined;

  // Registry object not found or malformed → treat as no history.
  if (!headsId || !historyId) return [];

  // Check if the agent has any history (via the heads table)
  let headField: Awaited<ReturnType<typeof suiClient.getDynamicFieldObject>>;
  try {
    headField = await suiClient.getDynamicFieldObject({
      parentId: headsId,
      name:     { type: "address", value: agentAddress },
    });
  } catch {
    return [];
  }

  if (!headField.data) return [];

  const headRecord = (headField.data.content as any)?.fields?.value?.fields;
  const latestSeq  = Number(headRecord?.seq_num ?? 0);

  // Get the inner history table for this agent
  const agentHistField = await suiClient.getDynamicFieldObject({
    parentId: historyId,
    name:     { type: "address", value: agentAddress },
  });
  const agentHistTableId = (agentHistField.data?.content as any)?.fields?.value?.fields?.id?.id as string;
  // Heads said this agent has history but the inner table is unreadable: degrade
  // to an empty chain rather than throwing, matching every other failure path.
  if (!agentHistTableId) return [];

  // Fetch every record concurrently, then assemble in seq order. Each record is
  // an on-chain dynamic-field read plus a Walrus blob fetch; serial awaits would
  // make a long chain noticeably slow.
  const entries = await Promise.all(
    Array.from({ length: latestSeq + 1 }, (_, seq) => readEntry(suiClient, agentHistTableId, seq)),
  );

  return entries;
}

// Read a single decision record (on-chain metadata + Walrus blob) for one seq.
async function readEntry(
  suiClient:        SuiJsonRpcClient,
  agentHistTableId: string,
  seq:              number,
): Promise<ChainEntry> {
  const recField = await suiClient.getDynamicFieldObject({
    parentId: agentHistTableId,
    name:     { type: "u64", value: String(seq) },
  });

  const r          = (recField.data?.content as any)?.fields?.value?.fields;
  const blobId     = bytesToString(r?.blob_id);
  const contentHash = Uint8Array.from(r?.content_hash ?? []);

  let content:     ContextBlob | null = null;
  let fetchFailed  = false;
  let hashMismatch = false;

  try {
    const rawBytes   = await fetchBlob(blobId);
    const actualHash = new Uint8Array(sha256.array(rawBytes));
    hashMismatch     = !arraysEqual(actualHash, contentHash);
    if (!hashMismatch) {
      content = JSON.parse(new TextDecoder().decode(rawBytes));
    }
  } catch {
    fetchFailed = true; // network failure, NOT the same as TAMPERED
  }

  return {
    seqNum:         seq,
    blobId,
    contentHash,
    prevHash:       Uint8Array.from(r?.prev_hash ?? []),
    certifiedEpoch: Number(r?.certified_epoch ?? 0),
    endEpoch:       Number(r?.end_epoch ?? 0),
    summary:        bytesToString(r?.decision_summary),
    content,
    fetchFailed,
    hashMismatch,
  };
}

/**
 * Walk the cross-agent provenance graph starting from one agent: fetch its chain,
 * follow `derived_from` references to other agents, and fetch those too (bounded,
 * deduped). Returns one chain per agent, root first, ready to feed straight into
 * buildDecisionGraph for a multi-lane provenance DAG.
 */
export async function fetchProvenance(
  suiClient:   SuiJsonRpcClient,
  rootAddress: string,
  registryId:  string = REGISTRY_ID,
  maxDepth     = 6,
): Promise<ChainEntry[][]> {
  const seen = new Set<string>();
  const result: ChainEntry[][] = [];

  async function walk(addr: string, depth: number): Promise<void> {
    if (seen.has(addr) || depth > maxDepth) return;
    seen.add(addr);

    const chain = await fetchDecisionChain(suiClient, addr, registryId);
    if (chain.length === 0) return;
    result.push(chain);

    const refAgents = new Set<string>();
    for (const e of chain) {
      for (const ref of e.content?.derived_from ?? []) {
        if (ref.agent && !seen.has(ref.agent)) refAgents.add(ref.agent);
      }
    }
    for (const a of refAgents) await walk(a, depth + 1);
  }

  await walk(rootAddress, 0);
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bytesToString(raw: number[] | Uint8Array | undefined): string {
  if (!raw) return "";
  return new TextDecoder().decode(Uint8Array.from(raw));
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
