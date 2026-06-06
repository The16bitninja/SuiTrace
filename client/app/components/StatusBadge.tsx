export type EntryStatus = "VERIFIED" | "TAMPERED" | "UNAVAILABLE";

export function entryStatus(e: {
  fetchFailed: boolean;
  hashMismatch: boolean;
}): EntryStatus {
  if (e.hashMismatch) return "TAMPERED";
  if (e.fetchFailed) return "UNAVAILABLE";
  return "VERIFIED";
}

const STYLES: Record<EntryStatus, string> = {
  VERIFIED:    "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  TAMPERED:    "border-red-500/40 text-red-300 bg-red-500/10",
  UNAVAILABLE: "border-white/15 text-zinc-400 bg-white/5",
};

const LABELS: Record<EntryStatus, string> = {
  VERIFIED:    "✓ VERIFIED",
  TAMPERED:    "✗ TAMPERED",
  UNAVAILABLE: "○ CONTEXT UNAVAILABLE",
};

export default function StatusBadge({
  status,
  large = false,
}: {
  status: EntryStatus;
  large?: boolean;
}) {
  const size = large
    ? "text-xl font-bold px-4 py-2 border-2"
    : "text-xs font-semibold px-2 py-0.5 border";
  return (
    <span className={`inline-block rounded-md ${size} ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
