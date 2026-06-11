# SuiTrace — Pending TODOs

## ✅ DEPLOYED TO TESTNET (2026-06-07)

- Package: `0xc99c1f17142086ddc3ecfc04bda67660ba96f1d3c85ea1b05911fdaf80984038`
- AgentRegistry (shared): `0xd4aeb1b24182906151ac00ad5485c8de18865bb9ef34a5e323331e5d7fdfa327`
- Demo agent: `0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025`
- 2 real decisions seeded (HOLD → BUY); `verify.ts` → CHAIN INTEGRITY: PASS; UI verified live.
- Config: root `.env` + `client/.env.local` hold the testnet IDs (gitignored).

The gas blocker below is RESOLVED. Remaining: demo recording, video, submission writeup.

---


## ✅ Integration proven on a LOCAL network (no testnet gas needed)

The full write → Walrus → Sui → read → verify path has been run end-to-end on a
local Sui network (`sui start --force-regenesis --with-faucet`):
- Contract `test-publish`'d locally; `AgentRegistry` shared object created
- `pnpm demo` x2: session 1 HOLD → session 2 BUY (memory-informed), both anchored
- `scripts/verify.ts` → CHAIN INTEGRITY: PASS (2 VERIFIED decisions)
- Web UI (prod build, pointed at local) rendered the real chain + Walrus blobs

This retired the previously-untested seam (recordDecision PTB encoding +
fetchDecisionChain dynamic-field parsing). **No bugs found.**

The only thing left that needs testnet gas is a *public testnet* deployment for
the judges — the code itself is verified.

---

## ⛔ BLOCKED: Public Sui **testnet** deployment

Everything is ready; the only blocker is **testnet gas**.

**Deployer address:** `0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025`
(currently 0 SUI — `sui client gas` shows no coins)

**Faucet is rate-limited** — both `sui client faucet` and the HTTP endpoint
`https://faucet.testnet.sui.io/v1/gas` return `Too Many Requests` on every attempt.

### To unblock, get gas via one of:
- Web faucet: https://faucet.sui.io/?address=0x9e7a2c08cfcd35e83171bf61bb15d04800f516f746f4cb1e5ac802759a090025
- Sui Discord `#testnet-faucet` channel
- Transfer SUI from another funded testnet address
- Wait for the IP rate limit to clear, then re-run the faucet

### Once funded, run (everything is prepared):
```bash
# 1. Publish + auto-write PACKAGE_ID/REGISTRY_ID into .env
./scripts/deploy.sh

# 2. Add an agent key to .env
sui keytool generate ed25519
sui keytool export --key-identity <address> --json   # copy exportedKey → AGENT_PRIVATE_KEY in .env

# 3. Two-session demo
pnpm demo    # session 1 → HOLD
pnpm demo    # session 2 → BUY (reads session 1 from Walrus)
```

### Then verify:
- ≥2 decisions on-chain, chain integrity PASS
- Open the UI at `/<AGENT_ADDRESS>` and confirm VERIFIED badges + cert epochs render
- Point the running UI's `NEXT_PUBLIC_SUITRACE_REGISTRY_ID` at the deployed registry

---

## After deploy
- [ ] Record terminal demo (sessions 1+2)
- [ ] Record browser demo (judge browses + clicks Verify integrity)
- [ ] README: lead with DAO/$50K failure scenario
- [ ] README: PTB atomicity caveat ("two steps, sequential, not atomic")
