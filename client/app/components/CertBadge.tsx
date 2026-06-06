const EXPIRY_WARNING_EPOCHS = 5;

export default function CertBadge({
  certifiedEpoch,
  endEpoch,
}: {
  certifiedEpoch: number;
  endEpoch: number;
}) {
  const epochsLeft = endEpoch - certifiedEpoch;
  const expiringSoon = epochsLeft <= EXPIRY_WARNING_EPOCHS;

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300">
      <span>
        ✓ certified epoch {certifiedEpoch} · expires epoch {endEpoch}
      </span>
      {expiringSoon && (
        <span className="font-semibold text-amber-400">⚠ expiring soon</span>
      )}
    </span>
  );
}
