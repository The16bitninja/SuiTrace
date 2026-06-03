import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import type { Signer } from "@mysten/sui/cryptography";
import { sha256 } from "js-sha256";
import { uploadBlob, fetchBlob } from "./walrus.js";

const PACKAGE_ID  = process.env.SUITRACE_PACKAGE_ID ?? "";
const REGISTRY_ID = process.env.SUITRACE_REGISTRY_ID ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextBlob {
  agent:        string;
  seq_num:      number;
  timestamp_ms: number;
  context:      unknown;
  decision:     string;
  prev_blob_id: string | null;
  prev_hash:    string | null;
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
  fetchFailed:    boolean;   // network/404 — CONTEXT UNAVAILABLE, never TAMPERED
  hashMismatch:   boolean;   // sha256 mismatch — TAMPERED
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
  const bytes = new TextEncoder().encode(JSON.stringify(blob, null, 2));
  const hash  = new Uint8Array(sha256.array(bytes));
  return { bytes, hash };
}

// ── Pure: chain verification ──────────────────────────────────────────────────

export function verifyChain(chain: ChainEntry[]): VerifyResult {
  const details = chain.map((e) => {
    if (e.fetchFailed)  return { seqNum: e.seqNum, status: "UNREACHABLE" as const, reason: "blob fetch failed — context unavailable" };
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
  suiClient: SuiClient,
  signer:    Signer,
  params: {
    agentAddress: string;
    seqNum:       number;
    context:      unknown;
    decision:     string;
    summary:      string;
    prevBlobId:   string | null;
    prevHash:     Uint8Array | null;
  },
): Promise<{ txDigest: string; blobId: string; seqNum: number }> {
  const { bytes, hash } = buildContextBlob(
    params.agentAddress,
    params.seqNum,
    params.context,
    params.decision,
    params.prevBlobId,
    params.prevHash,
  );

  // Step 1 — upload to Walrus (off-chain HTTP)
  console.log(`  Uploading blob (~${bytes.length}B) to Walrus...`);
  const { blobId, certifiedEpoch, endEpoch } = await uploadBlob(bytes, 50);
  console.log(`  blob_id=${blobId} epoch=${certifiedEpoch}→${endEpoch}`);

  // Step 2 — anchor on Sui via PTB (sequential after step 1, NOT atomic)
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

  return { txDigest: result.digest, blobId, seqNum: params.seqNum };
}

// ── Read path ─────────────────────────────────────────────────────────────────

export async function fetchDecisionChain(
  suiClient:    SuiClient,
  agentAddress: string,
): Promise<ChainEntry[]> {
  // Read registry object to get the heads and history table IDs
  const registry = await suiClient.getObject({
    id:      REGISTRY_ID,
    options: { showContent: true },
  });

  const regFields  = (registry.data?.content as any)?.fields;
  const headsId    = regFields?.heads?.fields?.id?.id as string | undefined;
  const historyId  = regFields?.history?.fields?.id?.id as string | undefined;

  if (!headsId || !historyId) throw new Error("Could not read AgentRegistry table IDs");

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
  if (!agentHistTableId) throw new Error("Could not read agent history table ID");

  // Fetch all records in order by seq_num
  const entries: ChainEntry[] = [];

  for (let seq = 0; seq <= latestSeq; seq++) {
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
      fetchFailed = true; // network failure — NOT the same as TAMPERED
    }

    entries.push({
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
    });
  }

  return entries;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bytesToString(raw: number[] | Uint8Array | undefined): string {
  if (!raw) return "";
  return new TextDecoder().decode(Uint8Array.from(raw));
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
