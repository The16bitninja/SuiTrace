"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ChainEntry } from "suitrace-sdk";
import StatusBadge, { entryStatus } from "./StatusBadge";

const EXPIRY_WARNING_EPOCHS = 5;

export default function DecisionRow({
  entry,
  address,
  index = 0,
}: {
  entry: ChainEntry;
  address: string;
  index?: number;
}) {
  const expiringSoon =
    entry.endEpoch - entry.certifiedEpoch <= EXPIRY_WARNING_EPOCHS;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="border-t border-white/10 transition-colors hover:bg-white/[0.03]"
    >
      <td className="px-4 py-3 font-mono text-sm text-zinc-500">{entry.seqNum}</td>
      <td className="px-4 py-3">
        <Link
          href={`/${address}/${entry.seqNum}`}
          className="font-medium text-zinc-100 transition-colors hover:text-sky-300 hover:underline"
        >
          {entry.summary || "(no summary)"}
        </Link>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-zinc-400">
        epoch {entry.certifiedEpoch}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-zinc-400">
        epoch {entry.endEpoch}
        {expiringSoon && <span className="ml-2 text-amber-400">⚠ soon</span>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={entryStatus(entry)} />
      </td>
    </motion.tr>
  );
}
