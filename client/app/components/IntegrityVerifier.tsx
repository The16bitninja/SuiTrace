"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { VerifyResult } from "suitrace-sdk";

export default function IntegrityVerifier({ result }: { result: VerifyResult }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);

  const tone =
    result.status === "PASS"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : result.status === "FAIL"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : "border-white/15 bg-white/5 text-zinc-300";

  const headline =
    result.status === "PASS"
      ? "✓ CHAIN INTEGRITY: PASS"
      : result.status === "FAIL"
      ? "✗ CHAIN INTEGRITY: FAIL"
      : "○ CHAIN INTEGRITY: UNREACHABLE";

  const failing = result.details.filter((d) => d.status !== "PASS");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={`relative overflow-hidden rounded-lg border p-4 ${tone}`}
    >
      {result.status === "PASS" && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          animate={{ boxShadow: [
            "0 0 0px 0px rgba(16,185,129,0)",
            "0 0 28px -6px rgba(16,185,129,0.45)",
            "0 0 0px 0px rgba(16,185,129,0)",
          ] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="text-base font-bold tracking-tight">{headline}</span>
        <button
          onClick={() => startTransition(() => router.refresh())}
          disabled={isPending}
          className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          {isPending ? "Verifying…" : "Re-verify integrity"}
        </button>
      </div>

      {result.details.length > 0 && (
        <p className="relative mt-1 text-sm opacity-80">
          {result.details.length} decision(s) checked ·{" "}
          {result.details.filter((d) => d.status === "PASS").length} verified
          {failing.length > 0 && ` · ${failing.length} flagged`}
        </p>
      )}

      {failing.length > 0 && (
        <button
          onClick={() => setShowDetails((s) => !s)}
          className="relative mt-2 text-sm underline opacity-90"
        >
          {showDetails ? "Hide" : "Show"} flagged decisions
        </button>
      )}

      <AnimatePresence initial={false}>
        {showDetails && failing.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative mt-2 space-y-1 overflow-hidden text-sm"
          >
            {failing.map((d) => (
              <li key={d.seqNum}>
                <span className="font-mono">seq {d.seqNum}</span>: {d.status}:{" "}
                {d.reason}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
