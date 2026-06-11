import Link from "next/link";
import { fetchDecisionChain } from "suitrace-sdk";
import { suiClient, REGISTRY_ID, WALRUS_AGGREGATOR } from "../../lib/sui";
import { getFixtureChain, isDemoAddress } from "../../lib/fixtures";
import CertBadge from "../../components/CertBadge";
import StatusBadge, { entryStatus } from "../../components/StatusBadge";
import Reveal from "../../components/motion/Reveal";

export const dynamic = "force-dynamic";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ address: string; seq: string }>;
}) {
  const { address, seq } = await params;
  const seqNum = Number(seq);

  const chain = isDemoAddress(address)
    ? getFixtureChain(address)
    : await fetchDecisionChain(suiClient, address, REGISTRY_ID);

  const entry = chain.find((e) => e.seqNum === seqNum);

  if (!entry) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <Link href={`/${address}`} className="text-sm text-sky-400 transition-colors hover:text-sky-300">
          ← back to agent
        </Link>
        <p className="mt-6 text-zinc-300">Decision #{seq} not found for this agent.</p>
      </main>
    );
  }

  const status = entryStatus(entry);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Reveal y={12}>
        <Link href={`/${address}`} className="text-sm text-sky-400 transition-colors hover:text-sky-300">
          ← back to agent
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-zinc-100">Decision #{entry.seqNum}</h1>
          <StatusBadge status={status} large />
        </div>

        <p className="mt-2 break-all font-mono text-sm text-zinc-500">{address}</p>

        <div className="mt-5">
          <CertBadge certifiedEpoch={entry.certifiedEpoch} endEpoch={entry.endEpoch} />
        </div>
      </Reveal>

      {/* On-chain record (the fingerprint) */}
      <Reveal delay={0.05} className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          On-chain record
        </h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-zinc-200">
          <dt className="text-zinc-500">seq_num</dt>
          <dd>{entry.seqNum}</dd>
          <dt className="text-zinc-500">blob_id</dt>
          <dd className="break-all">{entry.blobId}</dd>
          <dt className="text-zinc-500">content_hash</dt>
          <dd className="break-all">{toHex(entry.contentHash)}</dd>
          <dt className="text-zinc-500">prev_hash</dt>
          <dd className="break-all">{toHex(entry.prevHash)}</dd>
          <dt className="text-zinc-500">certified</dt>
          <dd>epoch {entry.certifiedEpoch}</dd>
          <dt className="text-zinc-500">expires</dt>
          <dd>epoch {entry.endEpoch}</dd>
        </dl>
      </Reveal>

      {/* Context blob (the content, from Walrus) */}
      <Reveal delay={0.1} className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Context blob (from Walrus)
        </h2>

        {status === "VERIFIED" && entry.content ? (
          <pre className="max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/50 p-4 text-xs leading-relaxed text-emerald-300">
            {JSON.stringify(entry.content, null, 2)}
          </pre>
        ) : status === "TAMPERED" ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            The blob fetched from Walrus does not match the on-chain
            <span className="font-mono"> content_hash</span>. The content was
            altered after certification — it cannot be trusted and is not shown.
          </p>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
            The blob could not be fetched from Walrus right now. This is a
            network/availability issue — it does <strong>not</strong> mean the
            content was tampered with.
          </p>
        )}

        <a
          href={`${WALRUS_AGGREGATOR}/v1/blobs/${entry.blobId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-sky-400 underline transition-colors hover:text-sky-300"
        >
          View raw blob on Walrus ↗
        </a>
      </Reveal>

      {/* Link to the prior decision this one was derived from */}
      {entry.seqNum > 0 && (
        <Reveal delay={0.15} className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Memory used
          </h2>
          <Link
            href={`/${address}/${entry.seqNum - 1}`}
            className="text-sm text-sky-400 transition-colors hover:text-sky-300"
          >
            ← derived from decision #{entry.seqNum - 1} (prior memory this agent read)
          </Link>
        </Reveal>
      )}
    </main>
  );
}
