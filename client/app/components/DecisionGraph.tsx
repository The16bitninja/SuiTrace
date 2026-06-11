"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DecisionGraph as GraphData, GraphNode, NodeStatus } from "suitrace-sdk";

const STATUS: Record<NodeStatus, { color: string; label: string }> = {
  VERIFIED:    { color: "#10b981", label: "VERIFIED" },
  TAMPERED:    { color: "#ef4444", label: "TAMPERED" },
  UNAVAILABLE: { color: "#a1a1aa", label: "UNAVAILABLE" },
};

// Deterministic hue per agent address so each agent's nodes read as a group.
function agentHue(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) % 360;
  return h;
}
function shortAddr(a: string): string {
  return a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

type RFData = {
  agent: string;
  seqNum: number;
  summary: string;
  status: NodeStatus;
  certifiedEpoch: number;
  hue: number;
};

function DecisionNode({ data, selected }: NodeProps) {
  const d = data as RFData;
  const s = STATUS[d.status];
  const accent = `hsl(${d.hue} 70% 60%)`;
  return (
    <div
      className="relative w-[210px] overflow-hidden rounded-lg bg-[#0f0f14] shadow-lg transition-shadow"
      style={{
        border: `1px solid ${selected ? s.color : s.color + "55"}`,
        boxShadow: selected ? `0 0 0 1px ${s.color}, 0 0 22px -6px ${s.color}` : `0 0 16px -10px ${s.color}`,
      }}
    >
      {/* prev edges run horizontally (within a lane); derived_from run vertically
          (up to the artifact a decision was built on). Dedicated handles for each. */}
      <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="top" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      {/* agent accent stripe */}
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="py-2.5 pl-3.5 pr-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px]" style={{ color: accent }}>{shortAddr(d.agent)}</span>
          <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: s.color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-zinc-100">{d.summary}</p>
        <p className="mt-1.5 font-mono text-[9px] text-zinc-600">seq {d.seqNum} · cert epoch {d.certifiedEpoch}</p>
      </div>
    </div>
  );
}

const nodeTypes = { decision: DecisionNode };

const COL_GAP = 250;
const ROW_GAP = 130;

export default function DecisionGraph({ graph }: { graph: GraphData }) {
  const router = useRouter();
  const multiAgent = useMemo(() => new Set(graph.nodes.map((n) => n.agent)).size > 1, [graph.nodes]);
  const capped = graph.nodes.length < graph.totalNodes;

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
          hue: agentHue(n.agent),
        } satisfies RFData,
      })),
    [graph.nodes],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e) => {
        const derived = e.kind === "derived_from";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          // prev: horizontal (right → left). derived_from: vertical (a decision's
          // top → up to the artifact's bottom).
          sourceHandle: derived ? "top" : "right",
          targetHandle: derived ? "bottom" : "left",
          animated: derived,
          style: derived
            ? { stroke: "#38bdf8", strokeWidth: 1.6 }
            : { stroke: "#3f3f46", strokeWidth: 1.4 },
          markerEnd: { type: MarkerType.ArrowClosed, color: derived ? "#38bdf8" : "#52525b", width: 16, height: 16 },
        };
      }),
    [graph.edges],
  );

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-lg border border-white/10 bg-[#08080b]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, node) => {
          const d = node.data as RFData;
          router.push(`/${d.agent}/${d.seqNum}`);
        }}
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={26} size={1} />
        <Controls className="!border-white/10 !bg-white/5" showInteractive={false} />
        {multiAgent && (
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)" }}
            nodeColor={(n) => STATUS[(n.data as RFData).status].color}
          />
        )}

        {/* Legend */}
        <Panel position="top-left" className="!m-3 rounded-lg border border-white/10 bg-[#0f0f14]/90 px-3 py-2 text-[10px] text-zinc-400 backdrop-blur">
          <div className="mb-1 flex items-center gap-3">
            {(Object.keys(STATUS) as NodeStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS[k].color }} />
                {STATUS[k].label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-block h-px w-4" style={{ background: "#3f3f46" }} /> prev</span>
            <span className="flex items-center gap-1"><span className="inline-block h-px w-4" style={{ background: "#38bdf8" }} /> derived_from</span>
          </div>
        </Panel>

        {/* Cap notice */}
        {capped && (
          <Panel position="top-right" className="!m-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-medium text-amber-300">
            Showing {graph.nodes.length} of {graph.totalNodes} decisions (capped for performance)
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
