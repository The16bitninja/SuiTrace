# SuiTrace — Testnet Addresses

Network: **Sui testnet** · Walrus: **walrus-testnet**

## Contract

| What | Address |
|---|---|
| Package | `0xc99c1f17142086ddc3ecfc04bda67660ba96f1d3c85ea1b05911fdaf80984038` |
| AgentRegistry (shared object) | `0xd4aeb1b24182906151ac00ad5485c8de18865bb9ef34a5e323331e5d7fdfa327` |

## Single-agent demo (memory loop)

| Agent | Address | Demonstrates |
|---|---|---|
| DAO Treasury | `0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025` | seq0 `HOLD` → seq1 `BUY` (memory-informed). Also the deployer. |

## Multi-agent network (busy provenance graph)

A 6-agent DeFi swarm, 11 decisions, dense cross-agent `derived_from` references.
**View the Execution agent** — the page walks `derived_from` outward to render the whole network.

| Agent | Address | Role |
|---|---|---|
| **Execution** ⭐ | `0xa77013eea710650ab56891d33861c435a0f4ab4b160a7a70f8bed2276e0f94c6` | Fills orders; derives from Strategy + Risk. **Network root — view this.** |
| Risk | `0x9ddb65f347d6d842b4ba26542d45b9894968bae9d5119aa4303b76ea407b9c82` | VaR check; derives from Strategy + PriceOracle |
| Strategy | `0xb3eabc497966aded286c1006dae4c42bede5fc2b699d000d421679d7b52e908e` | Allocation; derives from Research |
| Research | `0x00a2e727e648d28e31182451790143e432ed0649f731dc3b66f369418c64ea32` | Thesis; derives from PriceOracle + SentimentOracle |
| PriceOracle | `0xd2c04f64062c25c44e7053860bd60e10cbf45467445273ffb3d46c994c4dc041` | Price feed source |
| SentimentOracle | `0xa9903bb8384c14f5154380dd9ae2bf4386b82187cd4737d390b3edafb20f1a20` | Sentiment source |

```
PriceOracle ─┐                 ┌─► Risk ─┐
SentimentOracle ─┴► Research ─► Strategy ─┴► Execution
```

## Quick links

- Single agent: `/0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025`
- Multi-agent network: `/0xa77013eea710650ab56891d33861c435a0f4ab4b160a7a70f8bed2276e0f94c6`
- Verify from CLI: `tsx scripts/verify.ts <address>` → `CHAIN INTEGRITY: PASS`
- Sui explorer: `https://suiscan.xyz/testnet/account/<address>`

## Notes

- The DAO Treasury agent is also the **deployer** (key in `.env` as `AGENT_PRIVATE_KEY`).
- Network agent keys were generated ephemerally by `scripts/seed-network.ts` and not
  persisted — the on-chain records they produced are permanent and public.
- An earlier 3-agent pipeline also exists on-chain (Research `0x04d1591c…`, Strategy
  `0x9e6ad458…`, Execution `0x5b164d63…`), superseded by the richer network above.
- `demo-tampered` and `demo-offline` are **simulations only** (those states cannot exist
  as real on-chain data) and have no agent address.
