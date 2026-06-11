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
  col:            number; // position within the lane (0-based)
  row:            number; // lane, ordered by dependency depth (sources first)
}

export interface GraphEdge {
  id:     string;
  source: string;
  target: string;
  kind:   "prev" | "derived_from";
}

export interface DecisionGraph {
  nodes:      GraphNode[];
  edges:      GraphEdge[];
  totalNodes: number; // total decisions across all lanes before any cap
}

export interface BuildOptions {
  maxNodes?:   number; // hard cap on rendered nodes (default 80)
  maxPerLane?: number; // cap per agent lane, keeping the most recent (default 14)
}

function statusOf(e: ChainEntry): NodeStatus {
  if (e.hashMismatch) return "TAMPERED";
  if (e.fetchFailed) return "UNAVAILABLE";
  return "VERIFIED";
}

function agentOf(e: ChainEntry, laneFallback: string): string {
  return e.content?.agent ?? laneFallback;
}

/**
 * Turn one or more agents' decision chains into a node/edge graph.
 *
 * Layout: one lane (row) per agent, ordered by dependency depth so sources
 * (oracles) sit at the top and consumers (execution) at the bottom — this makes
 * `derived_from` edges flow in one direction and reduces crossings. `col` is the
 * position within the lane (time order).
 *
 * Edges: `prev` links consecutive decisions within a lane; `derived_from` links a
 * decision to another node it references (matched by blob_id). Dangling refs are
 * dropped.
 *
 * Caps: a large network is trimmed to keep rendering tractable — each lane keeps
 * its most recent `maxPerLane` decisions, and the whole graph is capped at
 * `maxNodes`. `totalNodes` reports the pre-cap count so the UI can disclose it.
 */
export function buildDecisionGraph(chains: ChainEntry[][], opts: BuildOptions = {}): DecisionGraph {
  const maxPerLane = opts.maxPerLane ?? 14;
  const maxNodes   = opts.maxNodes ?? 80;

  const totalNodes = chains.reduce((n, c) => n + c.length, 0);

  // Lane identity + most-recent trim.
  const lanes = chains.map((chain, i) => {
    const agent = chain.length ? agentOf(chain[0], `lane${i}`) : `lane${i}`;
    const trimmed = chain.length > maxPerLane ? chain.slice(chain.length - maxPerLane) : chain;
    return { agent, origIndex: i, entries: trimmed };
  }).filter((l) => l.entries.length > 0);

  // Map every (kept) blob to the agent that owns it — for depth + edge resolution.
  const blobToAgent = new Map<string, string>();
  for (const lane of lanes) for (const e of lane.entries) blobToAgent.set(e.blobId, lane.agent);

  // Agent-level adjacency: agent → agents it derives from (present in the set).
  const refsOf = new Map<string, Set<string>>();
  for (const lane of lanes) {
    const set = refsOf.get(lane.agent) ?? new Set<string>();
    for (const e of lane.entries) {
      for (const ref of e.content?.derived_from ?? []) {
        const target = blobToAgent.get(ref.blob_id);
        if (target && target !== lane.agent) set.add(target);
      }
    }
    refsOf.set(lane.agent, set);
  }

  // Depth = longest derived_from path from a source; cycle-safe memoization.
  const depthMemo = new Map<string, number>();
  const visiting = new Set<string>();
  function depth(agent: string): number {
    if (depthMemo.has(agent)) return depthMemo.get(agent)!;
    if (visiting.has(agent)) return 0; // break cycles
    visiting.add(agent);
    let d = 0;
    for (const ref of refsOf.get(agent) ?? []) d = Math.max(d, 1 + depth(ref));
    visiting.delete(agent);
    depthMemo.set(agent, d);
    return d;
  }

  // Order lanes: sources (low depth) first, stable by original order.
  const ordered = [...lanes].sort((a, b) =>
    depth(a.agent) - depth(b.agent) || a.origIndex - b.origIndex,
  );

  // Emit nodes up to the global cap.
  const nodes: GraphNode[] = [];
  const idByBlob = new Map<string, string>();
  let row = 0;
  for (const lane of ordered) {
    if (nodes.length >= maxNodes) break;
    let col = 0;
    let placedInLane = 0;
    for (const e of lane.entries) {
      if (nodes.length >= maxNodes) break;
      const id = `${lane.agent}#${e.seqNum}`;
      nodes.push({
        id,
        agent:          lane.agent,
        seqNum:         e.seqNum,
        summary:        e.summary,
        decision:       e.content?.decision ?? null,
        status:         statusOf(e),
        certifiedEpoch: e.certifiedEpoch,
        endEpoch:       e.endEpoch,
        blobId:         e.blobId,
        col,
        row,
      });
      idByBlob.set(e.blobId, id);
      col++;
      placedInLane++;
    }
    if (placedInLane > 0) row++;
  }

  const included = new Set(nodes.map((n) => n.id));

  // prev edges between consecutive kept nodes in the same lane.
  const edges: GraphEdge[] = [];
  const byRow = new Map<number, GraphNode[]>();
  for (const n of nodes) (byRow.get(n.row) ?? byRow.set(n.row, []).get(n.row)!).push(n);
  for (const laneNodes of byRow.values()) {
    const sorted = laneNodes.sort((a, b) => a.col - b.col);
    for (let i = 1; i < sorted.length; i++) {
      edges.push({ id: `${sorted[i - 1].id}->${sorted[i].id}`, source: sorted[i - 1].id, target: sorted[i].id, kind: "prev" });
    }
  }

  // derived_from edges between kept nodes.
  for (const lane of ordered) {
    for (const e of lane.entries) {
      const sourceId = idByBlob.get(e.blobId);
      if (!sourceId || !included.has(sourceId)) continue;
      for (const ref of e.content?.derived_from ?? []) {
        const targetId = idByBlob.get(ref.blob_id);
        if (!targetId || !included.has(targetId)) continue;
        edges.push({ id: `${sourceId}~>${targetId}`, source: sourceId, target: targetId, kind: "derived_from" });
      }
    }
  }

  return { nodes, edges, totalNodes };
}
