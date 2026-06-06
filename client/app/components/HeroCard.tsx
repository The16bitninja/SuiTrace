"use client";

import { motion } from "motion/react";
import CountUp from "./motion/CountUp";

const ROWS = [
  { seq: 0, text: "HOLD — insufficient trend data", epoch: 87 },
  { seq: 1, text: "BUY — uptrend confirmed (memory)", epoch: 88 },
];

/**
 * The hero's mock verification card. Slides in from the right on load, then
 * floats gently. Epoch numbers count up. All transforms are dropped under
 * reduced-motion (via the app-wide MotionConfig).
 */
export default function HeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28, rotate: -1 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-zinc-500">0xDA0…TREASURY</span>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            ✓ VERIFIED
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {ROWS.map((d) => (
            <div
              key={d.seq}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="flex justify-between text-xs text-zinc-500">
                <span>seq {d.seq}</span>
                <span>
                  ✓ certified epoch <CountUp to={d.epoch} duration={1.4} />
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-200">{d.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-sm font-bold text-emerald-300">
          CHAIN INTEGRITY: PASS
        </div>
      </motion.div>
    </motion.div>
  );
}
