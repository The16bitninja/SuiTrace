import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "../components/CodeBlock";
import Reveal from "../components/motion/Reveal";
import { Stagger, StaggerItem } from "../components/motion/Stagger";

export const metadata: Metadata = {
  title: "Developers — SuiTrace",
  description:
    "Add tamper-evident, verifiable memory to any AI agent in ~10 lines. Read your history from Walrus, record decisions anchored on Sui.",
};

const SETUP = `import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});
const signer = Ed25519Keypair.fromSecretKey(process.env.AGENT_PRIVATE_KEY!);
const agentAddress = signer.toSuiAddress();`;

const ENV = `# The shared, public registry — same for every agent.
SUITRACE_PACKAGE_ID=0x...
SUITRACE_REGISTRY_ID=0x...

# Your agent's signing key.
#   sui keytool generate ed25519
#   sui keytool export --key-identity <addr> --json   -> exportedKey
AGENT_PRIVATE_KEY=suiprivkey1...`;

const READ = `import { fetchDecisionChain, verifyChain } from "@suitrace/sdk";

// At session start: read your own decision history back from Walrus.
const history = await fetchDecisionChain(client, agentAddress);

// Optionally confirm nothing was tampered before trusting it.
const check = verifyChain(history); // { status: "PASS" | "FAIL" | "UNREACHABLE", details }

// Feed prior context into your prompt — this is the "memory" half.
const priorMemory = history
  .filter((e) => !e.fetchFailed && !e.hashMismatch)
  .map((e) => e.content);`;

const WRITE = `import { recordDecision } from "@suitrace/sdk";

// ...your agent decides something using priorMemory as context...

const prev = history.at(-1) ?? null;
await recordDecision(client, signer, {
  agentAddress,
  seqNum:     history.length,
  context,                              // any JSON: prompt, oracle data, tool results
  decision,                             // the action the agent took
  summary,                              // short on-chain label
  prevBlobId: prev?.blobId      ?? null,
  prevHash:   prev?.contentHash ?? null,
});
// -> uploads context to Walrus, then anchors the hash on Sui.`;

const PREREQS = [
  {
    title: "A Sui keypair + gas",
    body: "Any Ed25519 keypair with a little testnet SUI. The agent's address is its identity — no account to create.",
  },
  {
    title: "The public registry",
    body: "One shared AgentRegistry serves every agent. Grab the PACKAGE_ID and REGISTRY_ID — that's all the config you need.",
  },
  {
    title: "The SDK",
    body: "@suitrace/sdk wraps the Walrus upload and the Sui transaction. Two functions: fetchDecisionChain and recordDecision.",
  },
];

export default function DevelopersPage() {
  return (
    <main className="flex flex-col">
      {/* Header */}
      <section className="border-b border-white/10">
        <Reveal className="mx-auto max-w-4xl px-6 py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-300">
            For developers
          </span>
          <h1 className="mt-5 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Add tamper-evident memory to any agent.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
            SuiTrace adds persistent, verifiable memory to an existing agent in
            about ten lines — two SDK calls. There is{" "}
            <span className="text-zinc-200">no registration and no permission step</span>:
            the registry is a shared on-chain object, and your keypair is your identity.
          </p>
        </Reveal>
      </section>

      {/* Prerequisites */}
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              What you need
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Three things, once. Then it&apos;s just function calls.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 md:grid-cols-3">
            {PREREQS.map((p, i) => (
              <StaggerItem key={p.title} hover className="h-full">
                <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20">
                  <span className="font-mono text-sm font-semibold text-sky-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-100">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Setup + env */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              1. Connect
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Point the SDK at testnet and load your signing key. The
              <span className="font-mono text-zinc-300"> @suitrace/sdk</span> package
              lives in <span className="font-mono text-zinc-300">sdk/</span> of the repo
              (workspace package — not yet on npm).
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-6">
            <CodeBlock code={SETUP} lang="ts" />
          </Reveal>
          <Reveal delay={0.1} className="mt-4">
            <CodeBlock code={ENV} lang="env" />
          </Reveal>
        </div>
      </section>

      {/* Read */}
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              2. Read your history (memory)
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              At the start of each session, pull the agent&apos;s own decision
              chain back from Walrus and feed it into the prompt.
              <span className="text-zinc-300"> verifyChain</span> returns PASS,
              FAIL (tampered), or UNREACHABLE (blob offline — never confused with
              tampering).
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-6">
            <CodeBlock code={READ} lang="ts" />
          </Reveal>
        </div>
      </section>

      {/* Write */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              3. Record a decision (audit)
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              After the agent decides, record it. The contract enforces the hash
              chain — you just pass the previous entry. The write is two steps,
              <span className="text-zinc-300"> sequential, not atomic</span>:
              Walrus PUT, then the Sui transaction.
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-6">
            <CodeBlock code={WRITE} lang="ts" />
          </Reveal>
        </div>
      </section>

      {/* Any language */}
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-6">
            <h3 className="text-base font-semibold text-sky-200">
              Works from any language
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-sky-100/70">
              The TypeScript SDK is a convenience, not a requirement. Walrus is
              plain HTTP (PUT/GET) and Sui has SDKs for Python, Rust, and Go — an
              agent in any stack can write to the same shared registry and read
              any other agent&apos;s public chain. No API contract, no
              intermediary.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              See it end to end
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Browse a recorded agent and verify its chain yourself.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Try the demo →
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]"
              >
                Browse an agent
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
