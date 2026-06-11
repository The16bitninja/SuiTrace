"use client";

import { useState, type ReactNode } from "react";
import type { DecisionGraph as GraphData } from "suitrace-sdk";
import DecisionGraph from "./DecisionGraph";

type View = "table" | "graph";

export default function DecisionsView({
  graph,
  children,
  defaultView = "table",
}: {
  graph: GraphData;
  children: ReactNode; // server-rendered table
  defaultView?: View;
}) {
  const [view, setView] = useState<View>(defaultView);

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-sm">
        {(["table", "graph"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
              view === v
                ? "bg-white text-zinc-950"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "table" ? children : <DecisionGraph graph={graph} />}
    </div>
  );
}
