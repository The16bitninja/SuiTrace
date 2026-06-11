<div align="center">

# 🔗 SuiTrace

### Verifiable episodic memory for AI agents on Sui + Walrus

*The same Walrus blobs that make an agent smarter make it independently auditable.*

[![npm version](https://img.shields.io/npm/v/suitrace-sdk?color=38bdf8&label=suitrace-sdk)](https://www.npmjs.com/package/suitrace-sdk)
[![Sui](https://img.shields.io/badge/Sui-testnet-6fbcf0)](https://suiscan.xyz/testnet)
[![Walrus](https://img.shields.io/badge/Walrus-testnet-22d3ee)](https://www.walrus.xyz/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

*Built for Sui Overflow 2026 — Walrus track.*

</div>

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Problem Statement](#-problem-statement)
- [Our Approach](#-our-approach)
- [Challenges We Faced](#-challenges-we-faced)
- [Technologies We Used](#-technologies-we-used)
- [Architecture & Diagrams](#-architecture--diagrams)
- [Installation & Setup Guide](#-installation--setup-guide)
- [Team](#-team)
- [Contract Deployment](#-contract-deployment)

---

## 🧭 Project Overview

**SuiTrace** gives every AI agent a tamper-evident, independently-verifiable decision
log. An agent writes the full context behind each decision — the prompt, oracle data,
prior memory, and tool results — to **Walrus** as an epoch-certified blob, then anchors
only the blob's hash and a chain link on **Sui**. At the start of every session the agent
reads its own history back from Walrus and feeds it into the prompt, so the record that
makes it auditable is the same record that makes it smarter.

Anyone — a DAO, an auditor, a skeptic with `curl` — can re-fetch a blob, re-hash it, and
compare against the on-chain record to prove exactly what an agent knew and decided. No
operator, no permission, no trust required.

> DocuSign controls your signed documents. SuiTrace removes the operator's control over
> your AI agent's decision history.

---

## ❗ Problem Statement

A DAO agent manages $50K in treasury funds. The DAO votes to audit it. Today, the
**operator controls the logs** — and that breaks accountability in four ways:

1. **Logs can be altered or deleted.** Whoever runs the agent can rewrite its reasoning
   after the fact, and no one can tell.
2. **Decisions can be backdated or fabricated.** There's no proof of *when* an agent knew
   something — or whether a "decision" ever happened.
3. **Observability ≠ verifiability.** Tools like LangSmith/Langfuse show logs, but they're
   mutable database rows the provider can change. "Immutable" is marketing, not math.
4. **No independent record.** An auditor has to trust the same party they're auditing.

SuiTrace makes the record **cryptographically tamper-evident and operator-independent**:
alter the blob and the hash breaks; backdate it and the Walrus epoch certificate breaks.

---

## 💡 Our Approach

Walrus stores the **content**. Sui stores the **fingerprint**. The SDK is the only bridge.

### 1. Write context to Walrus
The full decision context (5–50 KB) is uploaded to Walrus as an epoch-certified,
content-addressed blob. On-chain storage would be prohibitively expensive; Walrus is
built for exactly this, and proves *when* the blob existed.

### 2. Anchor the hash on Sui
A SHA-256 of the blob, the previous decision's hash (chain link), and the Walrus epoch
are committed on-chain via a programmable transaction. The Move contract enforces
sequence + hash-chain integrity, and identity comes from `tx_context::sender()` — no
impersonation. *(The two steps are sequential, not atomic: Walrus PUT, then the Sui PTB.)*

### 3. Verify trustlessly
Re-fetch the blob, re-hash it, compare to the on-chain record:
- **match → VERIFIED**
- **mismatch → TAMPERED**
- **blob unreachable → CONTEXT UNAVAILABLE** (never conflated with tampering)

### 4. The memory loop
At session start the agent calls `fetchDecisionChain`, verifies it, and feeds prior
context into its prompt — making better decisions over time. Cross-agent `derived_from`
references turn many agents' chains into one traversable **provenance graph**.

**Add it to an agent in ~10 lines** (no registration — the registry is a shared on-chain
object and your keypair is your identity):

```bash
npm i suitrace-sdk @mysten/sui
```
```ts
import { fetchDecisionChain, recordDecision } from "suitrace-sdk";

const history = await fetchDecisionChain(client, agentAddress);   // read memory
// ...agent decides using `history` as context...
const prev = history.at(-1) ?? null;
await recordDecision(client, signer, {                            // record + anchor
  agentAddress, seqNum: history.length, context, decision, summary,
  prevBlobId: prev?.blobId ?? null,
  prevHash:   prev?.contentHash ?? null,
});
```

---

## 🧩 Challenges We Faced

### Sui / Move
- **Storing only the head wasn't enough.** Chain verification would have depended on
  Walrus being reachable. We added a second on-chain `history` table (`agent → seq →
  record`) so the hash chain is fully verifiable from Sui alone.
- **Dynamic-field indexing lag.** Reading a record back immediately after writing it hit
  propagation lag on the public fullnode; `recordDecision` returns the content hash so
  multi-agent seeding never has to re-read what it just wrote.
- **Modern Move package management.** Publishing is environment-aware (`testnet` is pinned
  in `Move.lock`); local publishing needed `test-publish`.

### Walrus
- **The `/metadata` endpoint 404s on testnet** - epoch data actually comes back in the
  upload response (`certifiedEpoch` / `endEpoch`).
- **Two upload response shapes** (`newlyCreated` vs `alreadyCertified`) both had to be
  handled.

### TypeScript SDK / npm
- **`@mysten/sui` v2 restructured its API** - `SuiClient`/`getFullnodeUrl` moved to
  `SuiJsonRpcClient`/`getJsonRpcFullnodeUrl` under `@mysten/sui/jsonRpc`.
- **`npm publish` ignores pnpm's `publishConfig` field-replacement.** A first publish
  shipped entry points pointing at unbundled `src/`; fixed by making the top-level
  `exports` point at the built `dist/` directly.

### Frontend (Next.js 16)
- **`params`/`searchParams` are now Promises** — every dynamic route awaits them.
- **Graph rendering at scale** — the provenance graph caps nodes (`maxNodes`/`maxPerLane`)
  and orders lanes by dependency depth so a large network stays renderable.

---

## 🛠 Technologies We Used

![Move](https://img.shields.io/badge/Move-4DA2FF?logo=move&logoColor=white)
![Sui](https://img.shields.io/badge/Sui-6fbcf0?logo=sui&logoColor=white)
![Walrus](https://img.shields.io/badge/Walrus-22d3ee)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38B2AC?logo=tailwindcss&logoColor=white)
![React Flow](https://img.shields.io/badge/React_Flow-FF0072)
![tsup](https://img.shields.io/badge/tsup-FE7A16)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)

- **Contract:** Move on Sui — `AgentRegistry` shared object + `record_decision` (11 tests)
- **Storage:** Walrus (testnet) — epoch-certified, content-addressed blobs
- **SDK:** TypeScript ([`suitrace-sdk`](https://www.npmjs.com/package/suitrace-sdk)) — Walrus HTTP client + write/read/verify/graph (16 tests), built with tsup, tested with Vitest
- **Web UI:** Next.js 16 + React 19 + Tailwind v4, provenance graph via React Flow

---

## 🗺 Architecture & Diagrams

![SuiTrace system architecture](docs/architecture.png)

The contract and Walrus never talk to each other — the SDK is the only bridge. Sui holds
the fingerprint (`content_hash`), Walrus holds the content, and anyone can re-fetch +
re-hash to confirm the two still agree.

- **Write path:** Agent → SDK → Walrus (upload) → Sui (anchor hash via PTB)
- **Read/verify path:** SDK reads the registry, fetches the blob, compares hashes →
  VERIFIED / TAMPERED / UNAVAILABLE
- **Provenance:** `derived_from` references weave multiple agents into one graph, rendered
  live in the web UI (source: [`client/public/architecture.svg`](client/public/architecture.svg))

---

## ⚙️ Installation & Setup Guide

### Contract
```bash
cd contracts
sui move build
sui move test          # 11/11 pass
```

### SDK
```bash
cd sdk
pnpm install
pnpm test              # 16/16 pass
pnpm build             # emits dist/ (ESM + CJS + d.ts)
```

### Full stack on a local Sui network (no testnet gas needed)
```bash
# 1. Start a local network with a faucet
sui start --force-regenesis --with-faucet

# 2. Fund the deployer
sui client switch --env local
curl -s -X POST http://127.0.0.1:9123/gas -H "Content-Type: application/json" \
  -d "{\"FixedAmountRequest\":{\"recipient\":\"$(sui client active-address)\"}}"

# 3. Publish (note PACKAGE_ID + the AgentRegistry object id)
cd contracts && sui client test-publish --build-env testnet --gas-budget 200000000 --json

# 4. Put SUITRACE_PACKAGE_ID / SUITRACE_REGISTRY_ID / AGENT_PRIVATE_KEY in .env
#    (+ SUI_RPC_URL=http://127.0.0.1:9000, SUI_NETWORK=localnet for local)

# 5. Two-session demo — session 2 reads session 1 from Walrus and decides differently
set -a; . ./.env; set +a
pnpm demo              # session 1 -> HOLD
pnpm demo              # session 2 -> BUY (memory-informed)

# 6. Verify any agent's chain
tsx scripts/verify.ts <agentAddress>   # -> CHAIN INTEGRITY: PASS
```

### Web UI
```bash
cd client
pnpm install
SUITRACE_REGISTRY_ID=0x... pnpm dev     # add SUI_RPC_URL / SUI_NETWORK for local
```
Open `/<AGENT_ADDRESS>` to browse a decision history, toggle the **Graph** view, click
**Re-verify integrity**, and open any decision for the full Walrus blob with a
VERIFIED / TAMPERED / CONTEXT UNAVAILABLE badge.

---

## 👥 Team

- [The16bitninja (Vedant Tarale)](https://github.com/The16bitninja)
- [VaibhavBaheti28 (Vaibhav Baheti)](https://github.com/VaibhavBaheti28)
<!-- add teammates: - [Name](https://github.com/handle) -->

---

## 📜 Contract Deployment

Live on **Sui testnet** · Walrus **testnet**.

| What | Address |
|---|---|
| Package | [`0xc99c1f17142086ddc3ecfc04bda67660ba96f1d3c85ea1b05911fdaf80984038`](https://suiscan.xyz/testnet/object/0xc99c1f17142086ddc3ecfc04bda67660ba96f1d3c85ea1b05911fdaf80984038) |
| AgentRegistry (shared) | [`0xd4aeb1b24182906151ac00ad5485c8de18865bb9ef34a5e323331e5d7fdfa327`](https://suiscan.xyz/testnet/object/0xd4aeb1b24182906151ac00ad5485c8de18865bb9ef34a5e323331e5d7fdfa327) |

**Single-agent demo (memory loop):** `HOLD` → memory-informed `BUY`

| Agent | Address |
|---|---|
| DAO Treasury | [`0x9e7a2c08…090025`](https://suiscan.xyz/testnet/account/0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025) |

**Multi-agent network (busy provenance graph)** — 6 agents, 11 decisions, dense
`derived_from` references. View the **Execution** agent to render the whole network.

| Agent | Address | Role |
|---|---|---|
| **Execution** ⭐ | [`0xa77013ee…f94c6`](https://suiscan.xyz/testnet/account/0xa77013eea710650ab56891d33861c435a0f4ab4b160a7a70f8bed2276e0f94c6) | derives from Strategy + Risk |
| Risk | [`0x9ddb65f3…b9c82`](https://suiscan.xyz/testnet/account/0x9ddb65f347d6d842b4ba26542d45b9894968bae9d5119aa4303b76ea407b9c82) | derives from Strategy + PriceOracle |
| Strategy | [`0xb3eabc49…e908e`](https://suiscan.xyz/testnet/account/0xb3eabc497966aded286c1006dae4c42bede5fc2b699d000d421679d7b52e908e) | derives from Research |
| Research | [`0x00a2e727…4ea32`](https://suiscan.xyz/testnet/account/0x00a2e727e648d28e31182451790143e432ed0649f731dc3b66f369418c64ea32) | derives from both oracles |
| PriceOracle | [`0xd2c04f64…dc041`](https://suiscan.xyz/testnet/account/0xd2c04f64062c25c44e7053860bd60e10cbf45467445273ffb3d46c994c4dc041) | price feed source |
| SentimentOracle | [`0xa9903bb8…1a20`](https://suiscan.xyz/testnet/account/0xa9903bb8384c14f5154380dd9ae2bf4386b82187cd4737d390b3edafb20f1a20) | sentiment source |

```
PriceOracle ─┐                 ┌─► Risk ─┐
SentimentOracle ─┴► Research ─► Strategy ─┴► Execution
```
