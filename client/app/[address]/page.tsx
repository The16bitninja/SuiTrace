import Link from "next/link";
import { fetchDecisionChain, verifyChain } from "@suitrace/sdk";
import { suiClient, REGISTRY_ID, isDeployed } from "../lib/sui";
import { getFixtureChain, isDemoAddress } from "../lib/fixtures";
import DecisionRow from "../components/DecisionRow";
import IntegrityVerifier from "../components/IntegrityVerifier";
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
  const demo = isDemoAddress(address);

  const chain = demo
    ? getFixtureChain(address)
    : await fetchDecisionChain(suiClient, address, REGISTRY_ID);

  const verification = verifyChain(chain);

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
            Sample data — illustrates the verification flow before the contract is
            live on testnet.
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

          <Reveal delay={0.05} className="mt-6 overflow-hidden rounded-lg border border-white/10">
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
                    key={entry.seqNum}
                    entry={entry}
                    address={address}
                    index={i}
                  />
                ))}
              </tbody>
            </table>
          </Reveal>
        </>
      )}
    </main>
  );
}
