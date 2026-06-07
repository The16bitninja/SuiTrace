"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DecisionGraph as GraphData, GraphNode, NodeStatus } from "@suitrace/sdk";

const STATUS_STYLES: Record<NodeStatus, { border: string; dot: string; label: string }> = {
  VERIFIED:    { border: "#10b981", dot: "#10b981", label: "✓ VERIFIED" },
  TAMPERED:    { border: "#ef4444", dot: "#ef4444", label: "✗ TAMPERED" },
  UNAVAILABLE: { border: "#52525b", dot: "#a1a1aa", label: "○ UNAVAILABLE" },
};

type RFData = {
  agent: string;
  seqNum: number;
  summary: string;
  status: NodeStatus;
  certifiedEpoch: number;
};

function DecisionNode({ data }: NodeProps) {
  const d = data as RFData;
  const s = STATUS_STYLES[d.status];
  return (
    <div
      className="w-[200px] rounded-lg bg-[#0f0f14] px-3 py-2.5 text-left shadow-lg"
      style={{ border: `1px solid ${s.border}66`, boxShadow: `0 0 18px -8px ${s.border}` }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-zinc-500">seq {d.seqNum}</span>
        <span className="text-[10px] font-semibold" style={{ color: s.border }}>
          {s.label}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium text-zinc-100">{d.summary}</p>
      <p className="mt-1 font-mono text-[10px] text-zinc-600">cert epoch {d.certifiedEpoch}</p>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { decision: DecisionNode };

const COL_GAP = 260;
const ROW_GAP = 150;

export default function DecisionGraph({ graph }: { graph: GraphData }) {
  const router = useRouter();

  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((n: GraphNode) => ({
        id: n.id,
        type: "decision",
        position: { x: n.col * COL_GAP, y: n.row * ROW_GAP },
        data: {
          agent: n.agent,
          seqNum: n.seqNum,
          summary: n.summary || "(no summary)",
          status: n.status,
          certifiedEpoch: n.certifiedEpoch,
        } satisfies RFData,
      })),
    [graph.nodes],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.kind === "derived_from",
        style:
          e.kind === "derived_from"
            ? { stroke: "#38bdf8", strokeDasharray: "5 4" }
            : { stroke: "#3f3f46" },
        label: e.kind === "derived_from" ? "derived_from" : undefined,
        labelStyle: { fill: "#7dd3fc", fontSize: 10 },
        labelBgStyle: { fill: "#0f0f14" },
      })),
    [graph.edges],
  );

  const agents = useMemo(
    () => Array.from(new Set(graph.nodes.map((n) => n.agent))),
    [graph.nodes],
  );

  return (
    <div className="h-[460px] w-full overflow-hidden rounded-lg border border-white/10 bg-[#08080b]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, node) => {
          const data = node.data as RFData;
          router.push(`/${data.agent}/${data.seqNum}`);
        }}
      >
        <Background color="#27272a" gap={28} />
        <Controls className="!border-white/10 !bg-white/5" showInteractive={false} />
        {agents.length > 1 && (
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)" }}
            nodeColor={(n) => STATUS_STYLES[(n.data as RFData).status].border}
          />
        )}
      </ReactFlow>
    </div>
  );
}
