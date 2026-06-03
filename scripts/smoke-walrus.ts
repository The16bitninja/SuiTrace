/**
 * Smoke test for Walrus HTTP API — no gas or Sui keypair needed.
 * Uploads a blob, fetches it back, verifies the content matches.
 *
 * Run: npx tsx scripts/smoke-walrus.ts
 */

import { uploadBlob, fetchBlob } from "../sdk/src/walrus.js";
import { sha256 } from "js-sha256";

async function main() {
  const PAYLOAD = `SuiTrace Walrus smoke test — ${new Date().toISOString()}`;
  const bytes   = new TextEncoder().encode(PAYLOAD);
  const expectedHash = Buffer.from(sha256.array(bytes)).toString("hex");

  console.log("=== Walrus smoke test ===\n");
  console.log(`Payload: "${PAYLOAD}"`);
  console.log(`SHA-256: ${expectedHash}\n`);

  // ── Upload ──────────────────────────────────────────────────────────────────

  console.log("1. Uploading to Walrus...");
  let blobId: string;
  let certifiedEpoch: number;
  let endEpoch: number;

  try {
    ({ blobId, certifiedEpoch, endEpoch } = await uploadBlob(bytes, 10));
    console.log(`   ✓ blob_id:          ${blobId}`);
    console.log(`   ✓ certified_epoch:  ${certifiedEpoch}`);
    console.log(`   ✓ end_epoch:        ${endEpoch}`);
  } catch (e) {
    console.error(`   ✗ Upload failed: ${e}`);
    process.exit(1);
  }

  // ── Fetch ───────────────────────────────────────────────────────────────────

  console.log("\n2. Fetching blob back...");
  // Brief pause — blob may not be immediately available on all aggregators
  await new Promise(r => setTimeout(r, 2000));

  let fetched: Uint8Array;
  try {
    fetched = await fetchBlob(blobId);
    console.log(`   ✓ Fetched ${fetched.length} bytes`);
  } catch (e) {
    console.error(`   ✗ Fetch failed: ${e}`);
    process.exit(1);
  }

  // ── Verify ──────────────────────────────────────────────────────────────────

  console.log("\n3. Verifying content...");
  const fetchedText = new TextDecoder().decode(fetched);
  const fetchedHash = Buffer.from(sha256.array(fetched)).toString("hex");

  if (fetchedText !== PAYLOAD) {
    console.error(`   ✗ Content mismatch!`);
    console.error(`     expected: "${PAYLOAD}"`);
    console.error(`     got:      "${fetchedText}"`);
    process.exit(1);
  }

  if (fetchedHash !== expectedHash) {
    console.error(`   ✗ Hash mismatch!`);
    console.error(`     expected: ${expectedHash}`);
    console.error(`     got:      ${fetchedHash}`);
    process.exit(1);
  }

  console.log(`   ✓ Content matches`);
  console.log(`   ✓ SHA-256 matches: ${fetchedHash}`);

  console.log(`\n=== PASSED ===`);
  console.log(`\nBlob URL:`);
  console.log(`  https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
