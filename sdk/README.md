# suitrace-sdk

[![npm version](https://img.shields.io/npm/v/suitrace-sdk?color=38bdf8)](https://www.npmjs.com/package/suitrace-sdk)

Verifiable episodic memory for AI agents on **Sui + Walrus**. Write a decision's full
context to Walrus, anchor its hash on Sui, and read it back — tamper-evident and
independently verifiable.

```bash
npm i suitrace-sdk @mysten/sui
```

`@mysten/sui` is a peer dependency — your app provides it.

## Quick start

```ts
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { recordDecision, fetchDecisionChain, verifyChain } from "suitrace-sdk";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const signer = Ed25519Keypair.fromSecretKey(process.env.AGENT_PRIVATE_KEY!);
const agent  = signer.toSuiAddress();

// Read your own history back from Walrus (memory).
const history = await fetchDecisionChain(client, agent);

// ...decide using `history` as context...

// Record the decision — uploaded to Walrus, hash anchored on Sui (audit).
const prev = history.at(-1) ?? null;
await recordDecision(client, signer, {
  agentAddress: agent,
  seqNum: history.length,
  context,            // any JSON: prompt, oracle data, tool results
  decision,           // the action taken
  summary,            // short on-chain label
  prevBlobId: prev?.blobId ?? null,
  prevHash:   prev?.contentHash ?? null,
});

// Anyone can verify, trustlessly.
const result = verifyChain(history);   // { status: "PASS" | "FAIL" | "UNREACHABLE", details }
```

## API

| Export | Purpose |
|---|---|
| `recordDecision(client, signer, params)` | Upload context to Walrus, anchor `{ blobId, sha256, prevHash, epoch }` on Sui. Optional `derivedFrom` for multi-agent provenance. |
| `fetchDecisionChain(client, agent, registryId?)` | Read an agent's chain; per entry flags `hashMismatch` (TAMPERED) vs `fetchFailed` (UNAVAILABLE). |
| `fetchProvenance(client, root, registryId?)` | Walk `derived_from` references across agents into one chain set. |
| `verifyChain(chain)` | `PASS` / `FAIL` (tampered) / `UNREACHABLE` (blob offline). |
| `buildContextBlob(...)` | Serialize a context blob + its SHA-256 (pure). |
| `buildDecisionGraph(chains, opts?)` | Build a node/edge provenance graph (pure; node cap for large sets). |
| `uploadBlob` / `fetchBlob` | Walrus HTTP helpers. |

## Configuration

- `SUITRACE_PACKAGE_ID`, `SUITRACE_REGISTRY_ID` — read from `process.env` (or pass
  `registryId` to the read functions).
- Walrus endpoints currently target **walrus-testnet**.

> Node ≥ 18 (uses global `fetch`). `buildContextBlob` uses `Buffer` (Node).

## License

Apache-2.0 — part of [SuiTrace](https://github.com/The16bitninja/SuiTrace).
