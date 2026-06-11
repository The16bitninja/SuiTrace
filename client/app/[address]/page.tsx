import Link from "next/link";
import type { ChainEntry } from "suitrace-sdk";
import { fetchDecisionChain, fetchProvenance, verifyChain, buildDecisionGraph } from "suitrace-sdk";
import { suiClient, REGISTRY_ID, isDeployed } from "../lib/sui";
import { getFixtureChain, isDemoAddress } from "../lib/fixtures";
import DecisionRow from "../components/DecisionRow";
import IntegrityVerifier from "../components/IntegrityVerifier";
import DecisionsView from "../components/DecisionsView";
import Reveal from "../components/motion/Reveal";

// Always fetch fresh — this is a live verification tool, not a cached view.
// (Intentionally dynamic, so the static-prefetch `unstable_instant` opt-in
// does not apply here.)
export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  // The only fixtures left are the tamper/offline simulations (states that
  // cannot exist as real on-chain data). Everything else is live chain data.
  const demo = isDemoAddress(address);

  // Build the per-agent chain set. One lane for a single agent; multiple lanes
  // when provenance fans out to other agents via derived_from references.
  let chains: ChainEntry[][];
  if (demo) {
    chains = [getFixtureChain(address)];
  } else {
    const root = await fetchDecisionChain(suiClient, address, REGISTRY_ID);
    const hasRefs = root.some((e) => (e.content?.derived_from?.length ?? 0) > 0);
    chains = hasRefs
      ? await fetchProvenance(suiClient, address, REGISTRY_ID)
      : [root];
  }

  const chain = chains.flat();          // flattened list for the table + verifier
  const verification = verifyChain(chain);
  const graph = buildDecisionGraph(chains);
  const multiAgent = chains.length > 1;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Reveal y={12}>
        <Link href="/" className="text-sm text-sky-400 transition-colors hover:text-sky-300">
          ← back to search
        </Link>

        <h1 className="mt-3 break-all font-mono text-xl font-bold text-zinc-100">
          {address}
        </h1>
        <p className="mt-1 text-zinc-500">{chain.length} decision(s) on record</p>

        {demo && (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Simulated — this state can&apos;t exist as real on-chain data (a blob
            can&apos;t be tampered after its hash is anchored, nor made unreachable
            on demand). It shows what detection looks like. All other agents on
            this site load live testnet data.
          </p>
        )}
      </Reveal>

      {chain.length === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="font-medium text-zinc-300">No decisions found.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {isDeployed()
              ? "This agent has not recorded any decisions yet."
              : "The registry is not deployed yet — try a demo address from the home page."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <IntegrityVerifier result={verification} />
          </div>

          <Reveal delay={0.05} className="mt-6">
            <DecisionsView graph={graph} defaultView={multiAgent ? "graph" : "table"}>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">seq</th>
                      <th className="px-4 py-3 font-medium">summary</th>
                      <th className="px-4 py-3 font-medium">certified</th>
                      <th className="px-4 py-3 font-medium">expires</th>
                      <th className="px-4 py-3 font-medium">status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((entry, i) => (
                      <DecisionRow
                        key={`${entry.content?.agent ?? "lane"}-${entry.seqNum}-${i}`}
                        entry={entry}
                        address={entry.content?.agent ?? address}
                        index={i}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </DecisionsView>
          </Reveal>
        </>
      )}
    </main>
  );
}
