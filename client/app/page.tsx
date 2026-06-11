import Link from "next/link";
import SearchBar from "./components/SearchBar";
import HeroCard from "./components/HeroCard";
import CodeBlock from "./components/CodeBlock";
import Aurora from "./components/motion/Aurora";
import Reveal from "./components/motion/Reveal";
import { Stagger, StaggerItem } from "./components/motion/Stagger";

const INTEGRATION_SNIPPET = `import { fetchDecisionChain, recordDecision } from "@suitrace/sdk";

// Read your own history back from Walrus (memory).
const history = await fetchDecisionChain(client, agentAddress);

// ...agent decides using history as context...

// Record the decision — uploaded to Walrus, hash anchored on Sui (audit).
const prev = history.at(-1) ?? null;
await recordDecision(client, signer, {
  agentAddress, seqNum: history.length,
  context, decision, summary,
  prevBlobId: prev?.blobId ?? null,
  prevHash:   prev?.contentHash ?? null,
});`;

// Real agents recorded on Sui testnet (live chain data).
const TREASURY_AGENT = "0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025";
const NETWORK_ROOT = "0xa77013eea710650ab56891d33861c435a0f4ab4b160a7a70f8bed2276e0f94c6";

const DEMO_LINKS = [
  { href: `/${TREASURY_AGENT}`,  label: "DAO Treasury agent",      note: "live on testnet · 2 decisions",       tone: "text-emerald-400" },
  { href: `/${NETWORK_ROOT}`,    label: "Multi-agent network",     note: "live on testnet · 6 agents, 11 traces", tone: "text-sky-400" },
  { href: "/demo-tampered",      label: "Tampered (simulated)",    note: "what tamper detection looks like",     tone: "text-red-400" },
  { href: "/demo-offline",       label: "Unavailable (simulated)", note: "blob offline → UNAVAILABLE",           tone: "text-zinc-500" },
];

const STEPS = [
  {
    n: "01",
    title: "Agent writes context to Walrus",
    body: "The full decision context — prompt, oracle data, prior memory, tool results (5–50 KB) — is uploaded to Walrus as an epoch-certified, content-addressed blob.",
  },
  {
    n: "02",
    title: "Hash is anchored on Sui",
    body: "A SHA-256 of the blob, plus a link to the previous decision, is committed on-chain via a programmable transaction. The operator can neither alter the blob nor backdate it.",
  },
  {
    n: "03",
    title: "Anyone verifies — trustlessly",
    body: "Re-fetch the blob from Walrus, re-hash it, compare to the on-chain record. Match → VERIFIED. Mismatch → TAMPERED. No permission, no operator, no trust required.",
  },
];

const WHY_WALRUS = [
  {
    title: "Built for large blobs",
    body: "Decision context is 5–50 KB. On-chain storage is prohibitive — Walrus is designed exactly for this.",
  },
  {
    title: "Epoch certification",
    body: "Walrus proves when a blob existed. You cannot fake that an agent knew something after the fact — the timestamp is not editable.",
  },
  {
    title: "Content-addressed",
    body: "The blob ID is derived from its bytes. Alter one byte and the hash breaks — tampering is mathematically detectable.",
  },
  {
    title: "Permanent public URLs",
    body: "Any verifier can fetch any context years later from the public aggregator, independent of SuiTrace ever existing.",
  },
];

const COMPARE_ROWS = [
  { label: "Tamper-evident (cryptographic)",        suitrace: true,  observ: false, saas: true },
  { label: "Verification without trusting operator", suitrace: true,  observ: false, saas: false },
  { label: "Epoch certification (no backdating)",    suitrace: true,  observ: false, saas: false },
  { label: "Agent reads its own history as memory",  suitrace: true,  observ: false, saas: false },
  { label: "Large context stored off-chain",         suitrace: true,  observ: true,  saas: false },
];

function Cell({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="font-semibold text-emerald-400">✓</span>
  ) : (
    <span className="text-zinc-700">—</span>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <Aurora />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <Stagger trigger="mount" className="flex flex-col items-start">
            <StaggerItem>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                Sui Overflow 2026 · Walrus track
              </span>
            </StaggerItem>

            <StaggerItem>
              <h1 className="mt-5 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                Verifiable memory for AI agents.
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
                SuiTrace gives every AI agent a tamper-evident decision log on Sui
                and Walrus. Agents read their own history back as memory — and
                anyone can independently verify what an agent knew and decided.
              </p>
            </StaggerItem>

            <StaggerItem className="mt-7 w-full max-w-lg">
              <SearchBar size="lg" />
              <p className="mt-2 text-sm text-zinc-500">
                Enter any agent address — or{" "}
                <Link href={`/${TREASURY_AGENT}`} className="font-medium text-sky-400 transition-colors hover:text-sky-300">
                  open the live demo
                </Link>
                .
              </p>
            </StaggerItem>

            <StaggerItem className="mt-8">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="#how-it-works"
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]"
                >
                  How it works
                </Link>
                <Link
                  href="#demo"
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
                >
                  Try the demo →
                </Link>
              </div>
            </StaggerItem>
          </Stagger>

          <div className="flex items-center justify-center">
            <HeroCard />
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section id="problem" className="border-b border-white/10">
        <Reveal className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-400">
            The problem
          </h2>
          <p className="mt-4 text-2xl font-semibold leading-snug text-zinc-100 sm:text-3xl">
            A DAO agent manages $50K in treasury funds. The DAO votes to audit
            it. Without SuiTrace, the operator controls the logs — and can
            delete, alter, or fabricate the agent&apos;s reasoning.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            With SuiTrace, every decision is permanently recorded. The full
            context lives as a Walrus blob: epoch-certified, content-addressed,
            retrievable by anyone. The operator cannot alter the blob without
            breaking the hash, or backdate it without breaking the epoch
            certificate. There is finally an independent record of what the
            agent saw — and what it decided.
          </p>
        </Reveal>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              How it works
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Walrus stores the content. Sui stores the fingerprint. The two are
              linked by a hash that no operator can forge.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <StaggerItem key={s.n} hover className="h-full">
                <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20">
                  <span className="font-mono text-sm font-semibold text-sky-400">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-100">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1} className="mt-6 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-6">
            <h3 className="text-base font-semibold text-sky-200">
              The memory loop
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-sky-100/70">
              At the start of each session, an agent fetches its own decision
              history from Walrus and uses it as context — making better
              decisions over time. The same blobs that make it auditable make it
              smarter. Memory and auditability are the same system.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Architecture ─────────────────────────────────────────────────── */}
      <section id="architecture" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              Architecture
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Walrus stores the content, Sui stores the fingerprint, and the SDK is
              the only bridge between them. Anyone can re-fetch a blob and re-hash it
              to confirm the two still agree.
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/architecture.svg"
              alt="SuiTrace system architecture — agents write through the SDK to Walrus (content) and Sui (fingerprint); anyone re-fetches and re-hashes to verify."
              className="w-full rounded-2xl shadow-[0_0_60px_-20px_rgba(56,189,248,0.25)]"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Why Walrus ───────────────────────────────────────────────────── */}
      <section id="why-walrus" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              Why Walrus, specifically
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              This isn&apos;t storage as an afterthought. Walrus is load-bearing
              for both the memory and the audit guarantees.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 sm:grid-cols-2">
            {WHY_WALRUS.map((w) => (
              <StaggerItem key={w.title} hover className="h-full">
                <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20">
                  <h3 className="text-lg font-semibold text-zinc-100">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{w.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section id="compare" className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              The difference
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              Centralized audit tools require trusting the platform. SuiTrace
              anchors proofs on a public chain the operator doesn&apos;t control.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Capability</th>
                  <th className="px-4 py-4 text-center font-semibold text-sky-300">SuiTrace</th>
                  <th className="px-4 py-4 text-center font-medium">Observability tools</th>
                  <th className="px-4 py-4 text-center font-medium">Signed-log SaaS</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.label} className="border-t border-white/10">
                    <td className="px-5 py-3.5 text-zinc-300">{r.label}</td>
                    <td className="px-4 py-3.5 text-center"><Cell ok={r.suitrace} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell ok={r.observ} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell ok={r.saas} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* ── For developers ───────────────────────────────────────────────── */}
      <section id="developers" className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
                Add SuiTrace in ~10 lines
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-zinc-400">
                No registration, no permission step — the registry is a shared
                on-chain object and your keypair is your identity. Two SDK calls:
                read your own memory back from Walrus, and record each decision
                with its hash anchored on Sui.
              </p>
              <Link
                href="/developers"
                className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Read the full guide →
              </Link>
            </Reveal>

            <Reveal delay={0.05}>
              <CodeBlock code={INTEGRATION_SNIPPET} lang="ts" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Demo ─────────────────────────────────────────────────────────── */}
      <section id="demo" className="border-b border-white/10">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
              See it for yourself
            </h2>
            <p className="mt-3 text-lg text-zinc-400">
              No wallet, no code. Browse an agent&apos;s decision history and
              verify the chain yourself.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mx-auto mt-8 max-w-lg">
            <SearchBar />
          </Reveal>

          <Stagger className="mt-8 space-y-3">
            {DEMO_LINKS.map((d) => (
              <StaggerItem key={d.href}>
                <Link
                  href={d.href}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 transition-colors hover:border-sky-400/30 hover:bg-sky-400/[0.04]"
                >
                  <span className="font-medium text-zinc-100">{d.label}</span>
                  <span className={`text-sm ${d.tone}`}>{d.note}</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </main>
  );
}
