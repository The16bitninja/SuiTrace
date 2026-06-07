import type { ChainEntry } from "./trace.js";

export type NodeStatus = "VERIFIED" | "TAMPERED" | "UNAVAILABLE";

export interface GraphNode {
  id:             string; // `${agent}#${seqNum}`
  agent:          string;
  seqNum:         number;
  summary:        string;
  decision:       string | null;
  status:         NodeStatus;
  certifiedEpoch: number;
  endEpoch:       number;
  blobId:         string;
  col:            number; // seqNum
  row:            number; // agent lane (chain index)
}

export interface GraphEdge {
  id:     string;
  source: string;
  target: string;
  kind:   "prev" | "derived_from";
}

export interface DecisionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function statusOf(e: ChainEntry): NodeStatus {
  if (e.hashMismatch) return "TAMPERED";
  if (e.fetchFailed) return "UNAVAILABLE";
  return "VERIFIED";
}

// Agent identity: prefer the (verified) blob's agent, else fall back to the lane index.
function agentOf(e: ChainEntry, laneFallback: string): string {
  return e.content?.agent ?? laneFallback;
}

/**
 * Turn one or more agents' decision chains into a node/edge graph.
 * - Each chain is a lane (row); col = seqNum.
 * - `prev` edges link consecutive decisions within a lane.
 * - `derived_from` edges link a decision to another node it references (by blob_id),
 *   read from the blob's `derived_from` field. Refs to blobs not in the loaded set
 *   are dropped (no dangling edges).
 */
export function buildDecisionGraph(chains: ChainEntry[][]): DecisionGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const idByBlob = new Map<string, string>();

  chains.forEach((chain, row) => {
    let prevId: string | null = null;

    for (const e of chain) {
      const agent = agentOf(e, `lane${row}`);
      const id = `${agent}#${e.seqNum}`;

      nodes.push({
        id,
        agent,
        seqNum:         e.seqNum,
        summary:        e.summary,
        decision:       e.content?.decision ?? null,
        status:         statusOf(e),
        certifiedEpoch: e.certifiedEpoch,
        endEpoch:       e.endEpoch,
        blobId:         e.blobId,
        col:            e.seqNum,
        row,
      });
      idByBlob.set(e.blobId, id);

      if (prevId !== null) {
        edges.push({ id: `${prevId}->${id}`, source: prevId, target: id, kind: "prev" });
      }
      prevId = id;
    }
  });

  // Second pass: cross-agent derived_from edges (targets must already be in the set).
  for (const chain of chains) {
    for (const e of chain) {
      const refs = e.content?.derived_from;
      if (!refs) continue;
      const sourceId = idByBlob.get(e.blobId);
      if (!sourceId) continue;
      for (const ref of refs) {
        const targetId = idByBlob.get(ref.blob_id);
        if (!targetId) continue; // dangling ref — target not loaded
        edges.push({
          id:     `${sourceId}~>${targetId}`,
          source: sourceId,
          target: targetId,
          kind:   "derived_from",
        });
      }
    }
  }

  return { nodes, edges };
}
