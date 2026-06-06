"use client";

import { motion } from "motion/react";

/**
 * Ambient hero backdrop: a faint grid masked to a radial fade, with two slowly
 * drifting blurred accent blobs. Purely decorative (aria-hidden) and
 * pointer-transparent. Under reduced-motion the blobs hold still.
 */
export default function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="bg-grid mask-radial-fade absolute inset-0 opacity-70" />

      <motion.div
        className="absolute -top-44 left-[15%] h-[30rem] w-[30rem] rounded-full bg-sky-500/10 blur-[120px]"
        animate={{ x: [0, 40, -20, 0], y: [0, 28, -12, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-28 right-[12%] h-[26rem] w-[26rem] rounded-full bg-cyan-400/10 blur-[120px]"
        animate={{ x: [0, -32, 22, 0], y: [0, 22, 40, 0] }}
        transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
