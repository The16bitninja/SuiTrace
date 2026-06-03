# SuiTrace — Contracts Reference & Testnet Deployment

## Overview

The SuiTrace contract is a single Move module (`suitrace::trace_log`) that lives on Sui as a **shared object**. It acts as a global registry: any AI agent with a Sui keypair can write tamper-evident decision records to it, and anyone can read any agent's full decision history without permission.

---

## Contract Layout

```
contracts/
├── Move.toml                        ← package manifest (edition 2024)
├── sources/
│   └── trace_log.move               ← the contract
└── tests/
    └── trace_log_tests.move         ← 8 unit tests
```

---

## Data Model

### `AgentRegistry` (shared object, one per deployment)

```move
public struct AgentRegistry has key {
    id: UID,
    heads: Table<address, DecisionRecord>,   // agent address → latest record
}
```

Created once by `init()` at publish time and shared globally. Every agent on every network uses the same `AgentRegistry`. There is no per-agent object — just one registry for all.

### `DecisionRecord` (stored inside the registry table)

```move
public struct DecisionRecord has store, copy, drop {
    agent:            address,       // who wrote it (tx sender, not user-supplied)
    seq_num:          u64,           // 0-indexed, must be contiguous
    blob_id:          vector<u8>,    // Walrus blob ID (UTF-8 string bytes)
    content_hash:     vector<u8>,    // sha256 of the Walrus blob (32 bytes)
    prev_hash:        vector<u8>,    // content_hash of previous record (32 zero bytes for genesis)
    certified_epoch:  u64,           // Walrus epoch when blob was certified
    end_epoch:        u64,           // Walrus epoch when blob expires
    decision_summary: vector<u8>,    // short human-readable label (< 256 bytes recommended)
}
```

The registry stores only the **latest** record per agent (the head). The full chain is reconstructed by the SDK, which walks backward through `prev_blob_id` pointers embedded in each Walrus blob.

### `DecisionLogged` (event, emitted on every write)

```move
public struct DecisionLogged has copy, drop {
    agent:           address,
    seq_num:         u64,
    blob_id:         vector<u8>,
    content_hash:    vector<u8>,
    certified_epoch: u64,
}
```

Emitted on every successful `record_decision` call. Enables off-chain indexers to track all activity without polling the registry object.

---

## Functions

### `record_decision` — write path

```move
public fun record_decision(
    registry:         &mut AgentRegistry,
    blob_id:          vector<u8>,    // Walrus blob ID returned by upload
    content_hash:     vector<u8>,    // sha256(blob bytes), 32 bytes
    prev_hash:        vector<u8>,    // previous record's content_hash (zeros for genesis)
    seq_num:          u64,           // must equal head.seq_num + 1
    certified_epoch:  u64,           // from Walrus upload response
    end_epoch:        u64,           // from Walrus upload response
    summary:          vector<u8>,    // short label
    ctx:              &mut TxContext,
)
```

Called via PTB by the TypeScript SDK after uploading the context blob to Walrus. The contract enforces two invariants — no user-supplied data can bypass them:

| Check | Condition | Abort code |
|---|---|---|
| Contiguous sequence | `seq_num == head.seq_num + 1` | `EBadSeqNum = 0` |
| Hash chain | `prev_hash == head.content_hash` | `EBadPrevHash = 1` |
| Genesis seq | First record: `seq_num == 0` | `EBadSeqNum = 0` |
| Genesis prev | First record: `prev_hash == 0x000...0` (32 zero bytes) | `EBadPrevHash = 1` |

The caller's identity comes from `ctx.sender()` — it is not a function argument. An operator cannot forge a record on behalf of another agent.

### `has_history` / `get_head` — read path

```move
public fun has_history(registry: &AgentRegistry, agent: address): bool
public fun get_head(registry: &AgentRegistry, agent: address): DecisionRecord
```

`get_head` aborts if the agent has no history — always call `has_history` first, or let the SDK handle the empty case.

### Accessors

All fields of `DecisionRecord` are exposed via individual accessor functions so the TypeScript SDK can read them without Move field visibility issues:

```
record_agent / record_seq_num / record_blob_id / record_content_hash /
record_prev_hash / record_certified_epoch / record_end_epoch / record_decision_summary
```

---

## Security Properties

| Property | How it's enforced |
|---|---|
| No seq gaps | `assert!(seq_num == head.seq_num + 1)` |
| No hash forgery | `assert!(prev_hash == head.content_hash)` — comparing against on-chain state |
| No impersonation | Agent identity = `tx_context::sender()` — requires the private key to sign the PTB |
| No backdating | Walrus `certified_epoch` is stored on-chain by the agent; an independent verifier can cross-check |
| No silent corruption | `content_hash` is on-chain; anyone can re-fetch the Walrus blob and verify |

---

## Unit Tests

Run with:

```bash
cd contracts
sui move test
```

8 tests, all pass, zero warnings:

| Test | What it proves |
|---|---|
| `test_genesis_record_succeeds` | First write at seq=0 with zero prev_hash succeeds |
| `test_sequential_records_succeed` | seq 0 → 1 with correct prev_hash chain succeeds |
| `test_skipped_seq_num_aborts` | seq 0 → 2 aborts with `EBadSeqNum` |
| `test_wrong_prev_hash_aborts` | Correct seq, wrong prev_hash aborts with `EBadPrevHash` |
| `test_genesis_nonzero_seq_aborts` | First write at seq=1 aborts |
| `test_genesis_nonzero_prev_hash_aborts` | First write with non-zero prev_hash aborts |
| `test_get_head_after_genesis` | `get_head` returns correct seq, epoch, and hash |
| `test_get_head_returns_latest` | After two writes, `get_head` reflects the second record |

---

## Deploying to Testnet

### Prerequisites

**1. Sui CLI installed**

```bash
sui --version
# sui 1.73.0-... or later
```

If not installed:
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git \
  --branch testnet sui
```

**2. Testnet environment active**

```bash
sui client envs          # check configured environments
sui client switch --env testnet
sui client active-env    # should print: testnet
```

**3. A funded testnet address**

```bash
sui client active-address   # your deployer address
sui client gas              # check balance
```

If balance is 0, request test tokens:

```bash
# Option A: CLI faucet
sui client faucet

# Option B: HTTP faucet directly
curl -X POST https://faucet.testnet.sui.io/v1/gas \
  -H "Content-Type: application/json" \
  -d "{\"FixedAmountRequest\":{\"recipient\":\"$(sui client active-address)\"}}"
```

Wait ~10 seconds, then `sui client gas` should show a coin.

### Build

```bash
cd contracts
sui move build
```

Expected output (no errors, no warnings):
```
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING SuiTrace
```

### Publish

```bash
sui client publish --gas-budget 200000000
```

The output will include several key sections. Look for:

```
----- Transaction Effects ----
Status : Success

----- Object changes ----
Created Objects:
  - ObjectID: 0x<PACKAGE_ID>        # ← your deployed package
    ObjectType: 0x...::package::UpgradeCap
  - ObjectID: 0x<REGISTRY_ID>       # ← the shared AgentRegistry
    ObjectType: 0x<PACKAGE_ID>::trace_log::AgentRegistry
```

**Save both IDs** — you need them for the SDK:

```bash
# Add to your .env
SUITRACE_PACKAGE_ID=0x<PACKAGE_ID>
SUITRACE_REGISTRY_ID=0x<REGISTRY_ID>
```

### Verify deployment

Confirm the `AgentRegistry` is live as a shared object:

```bash
sui client object <REGISTRY_ID>
```

You should see:
```
Owner: Shared { initial_shared_version: ... }
Type: 0x<PACKAGE_ID>::trace_log::AgentRegistry
```

### Record a test decision (manual PTB)

```bash
sui client ptb \
  --move-call "<PACKAGE_ID>::trace_log::record_decision" \
    "@<REGISTRY_ID>" \
    "vector[98,108,111,98,95,48]" \
    "vector[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]" \
    "vector[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]" \
    0 87 97 \
    "vector[72,79,76,68]" \
  --gas-budget 10000000
```

In practice the SDK handles this — the manual PTB is only for smoke-testing the deployment.

---

## After Deployment Checklist

- [ ] `SUITRACE_PACKAGE_ID` saved in `.env`
- [ ] `SUITRACE_REGISTRY_ID` saved in `.env`
- [ ] `sui client object <REGISTRY_ID>` shows `Owner: Shared`
- [ ] Both values added to Vercel / hosting env vars before deploying the UI

---

## Re-deploying (if contract changes)

Sui does not support in-place upgrades without an `UpgradeCap`. For testnet iteration, just republish:

```bash
sui client publish --gas-budget 200000000
```

This creates a **new** package and a **new** `AgentRegistry`. Update both env vars and clear any prior decision history (the old registry is abandoned, not migrated).

For mainnet / production, proper upgrade paths via `UpgradeCap` would be needed — out of scope for the hackathon.
