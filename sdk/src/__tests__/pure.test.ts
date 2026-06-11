import { describe, it, expect } from "vitest";
import { sha256 } from "js-sha256";
import { buildContextBlob, verifyChain } from "../trace.js";
import type { ChainEntry } from "../trace.js";

// ── buildContextBlob ──────────────────────────────────────────────────────────

describe("buildContextBlob", () => {
  const AGENT   = "0xcafe";
  const CONTEXT = { oracle: { price: 1.35 } };
  const DECISION = "HOLD: no prior history";

  it("returns a 32-byte hash", () => {
    const { hash } = buildContextBlob(AGENT, 0, CONTEXT, DECISION, null, null);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it("returns UTF-8 JSON bytes that parse correctly", () => {
    const { bytes } = buildContextBlob(AGENT, 0, CONTEXT, DECISION, null, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.agent).toBe(AGENT);
    expect(parsed.seq_num).toBe(0);
    expect(parsed.decision).toBe(DECISION);
    expect(parsed.context).toEqual(CONTEXT);
  });

  it("sets prev_blob_id and prev_hash to null for genesis", () => {
    const { bytes } = buildContextBlob(AGENT, 0, CONTEXT, DECISION, null, null);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.prev_blob_id).toBeNull();
    expect(parsed.prev_hash).toBeNull();
  });

  it("embeds prev_blob_id and prev_hash for non-genesis records", () => {
    const prevHash = new Uint8Array(32).fill(0xAA);
    const { bytes } = buildContextBlob(AGENT, 1, CONTEXT, "BUY", "blob_abc", prevHash);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.seq_num).toBe(1);
    expect(parsed.prev_blob_id).toBe("blob_abc");
    expect(parsed.prev_hash).toBe(Buffer.from(prevHash).toString("hex"));
  });

  it("hash matches independent sha256 of the same bytes", () => {
    const { bytes, hash } = buildContextBlob(AGENT, 0, CONTEXT, DECISION, null, null);
    const expected = new Uint8Array(sha256.array(bytes));
    expect(hash).toEqual(expected);
  });

  it("hash changes when context changes", () => {
    const { hash: h1 } = buildContextBlob(AGENT, 0, { price: 1 }, DECISION, null, null);
    const { hash: h2 } = buildContextBlob(AGENT, 0, { price: 2 }, DECISION, null, null);
    expect(h1).not.toEqual(h2);
  });

  it("hash changes when decision changes", () => {
    const { hash: h1 } = buildContextBlob(AGENT, 0, CONTEXT, "HOLD", null, null);
    const { hash: h2 } = buildContextBlob(AGENT, 0, CONTEXT, "BUY",  null, null);
    expect(h1).not.toEqual(h2);
  });

  it("includes a timestamp_ms field in the blob", () => {
    const before = Date.now();
    const { bytes } = buildContextBlob(AGENT, 0, CONTEXT, DECISION, null, null);
    const after = Date.now();
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.timestamp_ms).toBeGreaterThanOrEqual(before);
    expect(parsed.timestamp_ms).toBeLessThanOrEqual(after);
  });
});

// ── verifyChain ───────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<ChainEntry> = {}): ChainEntry {
  return {
    seqNum:          0,
    blobId:          "blob_0",
    contentHash:     new Uint8Array(32),
    prevHash:        new Uint8Array(32),
    certifiedEpoch:  87,
    endEpoch:        97,
    summary:         "HOLD",
    content:         null,
    fetchFailed:     false,
    hashMismatch:    false,
    ...overrides,
  };
}

describe("verifyChain", () => {
  it("empty chain returns PASS", () => {
    const result = verifyChain([]);
    expect(result.status).toBe("PASS");
    expect(result.details).toHaveLength(0);
  });

  it("all clean entries return PASS", () => {
    const chain = [
      makeEntry({ seqNum: 0 }),
      makeEntry({ seqNum: 1 }),
    ];
    const result = verifyChain(chain);
    expect(result.status).toBe("PASS");
    expect(result.details.every(d => d.status === "PASS")).toBe(true);
  });

  it("one fetchFailed entry returns UNREACHABLE", () => {
    const chain = [
      makeEntry({ seqNum: 0 }),
      makeEntry({ seqNum: 1, fetchFailed: true }),
    ];
    const result = verifyChain(chain);
    expect(result.status).toBe("UNREACHABLE");
    expect(result.details[1].status).toBe("UNREACHABLE");
    expect(result.details[0].status).toBe("PASS");
  });

  it("one hashMismatch entry returns FAIL", () => {
    const chain = [
      makeEntry({ seqNum: 0, hashMismatch: true }),
      makeEntry({ seqNum: 1 }),
    ];
    const result = verifyChain(chain);
    expect(result.status).toBe("FAIL");
    expect(result.details[0].status).toBe("FAIL");
  });

  it("FAIL takes precedence over UNREACHABLE", () => {
    const chain = [
      makeEntry({ seqNum: 0, fetchFailed: true }),
      makeEntry({ seqNum: 1, hashMismatch: true }),
    ];
    expect(verifyChain(chain).status).toBe("FAIL");
  });

  it("fetchFailed is UNREACHABLE not FAIL, reason string differs", () => {
    const chain = [makeEntry({ seqNum: 0, fetchFailed: true })];
    const { details } = verifyChain(chain);
    expect(details[0].status).toBe("UNREACHABLE");
    expect(details[0].reason).not.toMatch(/tamper/i);
  });

  it("hashMismatch detail includes 'mismatch' in reason", () => {
    const chain = [makeEntry({ seqNum: 0, hashMismatch: true })];
    const { details } = verifyChain(chain);
    expect(details[0].reason).toMatch(/mismatch/i);
  });

  it("details array has one entry per chain entry", () => {
    const chain = [makeEntry({ seqNum: 0 }), makeEntry({ seqNum: 1 }), makeEntry({ seqNum: 2 })];
    const { details } = verifyChain(chain);
    expect(details).toHaveLength(3);
  });
});
