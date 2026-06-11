import type { ChainEntry } from "suitrace-sdk";

/**
 * Simulation-only fixtures for the two states that CANNOT exist as real
 * on-chain data, by design:
 *   - TAMPERED: a blob can't be altered after its hash is anchored.
 *   - UNAVAILABLE: a blob can't be made unreachable on demand.
 * Everything else (happy path, multi-agent pipeline) is served from the live
 * testnet chain via real agent addresses. These fixtures are only reached by
 * the two sentinel addresses below.
 */

export const DEMO_ADDRESSES = {
  tampered:  "demo-tampered",
  offline:   "demo-offline",
} as const;

export function isDemoAddress(address: string): boolean {
  return (Object.values(DEMO_ADDRESSES) as string[]).includes(address);
}

const AGENT = "0xDA0...TREASURY";

function hash(seed: number): Uint8Array {
  return new Uint8Array(32).fill(seed);
}

function session0(): ChainEntry {
  return {
    seqNum:         0,
    blobId:         "7xKpDemoBlobSession0AAAAAAAAAAAAAAAAAAAAAAAA",
    contentHash:    hash(0xa0),
    prevHash:       new Uint8Array(32),
    certifiedEpoch: 87,
    endEpoch:       137,
    summary:        "HOLD: insufficient trend data for confident entry",
    fetchFailed:    false,
    hashMismatch:   false,
    content: {
      agent:        AGENT,
      seq_num:      0,
      timestamp_ms: 1748900000000,
      context: {
        oracle: { asset: "SUI/USD", price: 1.24, change_24h: "+8%", source: "pyth:SUI/USD" },
        prior_decisions: [],
      },
      decision:     "HOLD: insufficient trend data for confident entry",
      prev_blob_id: null,
      prev_hash:    null,
    },
  };
}

function session1(): ChainEntry {
  return {
    seqNum:         1,
    blobId:         "9mNqDemoBlobSession1BBBBBBBBBBBBBBBBBBBBBBBB",
    contentHash:    hash(0xb1),
    prevHash:       hash(0xa0),
    certifiedEpoch: 88,
    endEpoch:       138,
    summary:        "BUY: 2 consecutive rises confirm uptrend (memory-informed)",
    fetchFailed:    false,
    hashMismatch:   false,
    content: {
      agent:        AGENT,
      seq_num:      1,
      timestamp_ms: 1748986400000,
      context: {
        oracle: { asset: "SUI/USD", price: 1.35, change_24h: "+9%", source: "pyth:SUI/USD" },
        prior_decisions: [
          { seq: 0, decision: "HOLD: insufficient trend data for confident entry" },
        ],
      },
      decision:     "BUY: 2 consecutive rises confirm uptrend (memory-informed)",
      prev_blob_id: "7xKpDemoBlobSession0AAAAAAAAAAAAAAAAAAAAAAAA",
      prev_hash:    Buffer.from(hash(0xa0)).toString("hex"),
    },
  };
}

export function getFixtureChain(address: string): ChainEntry[] {
  if (address === DEMO_ADDRESSES.tampered) {
    // seq 1 blob was altered after certification, so the hash no longer matches.
    const tampered = session1();
    tampered.hashMismatch = true;
    tampered.content = null;
    return [session0(), tampered];
  }
  if (address === DEMO_ADDRESSES.offline) {
    // seq 1 blob is unreachable on Walrus: UNAVAILABLE, NOT tampered.
    const offline = session1();
    offline.fetchFailed = true;
    offline.content = null;
    return [session0(), offline];
  }
  return [session0(), session1()];
}
