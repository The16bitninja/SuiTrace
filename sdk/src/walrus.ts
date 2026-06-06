export const WALRUS_PUBLISHER  = "https://publisher.walrus-testnet.walrus.space";
export const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export interface BlobMeta {
  blobId: string;
  certifiedEpoch: number;
  endEpoch: number;
}

export async function uploadBlob(content: Uint8Array, epochs = 10): Promise<BlobMeta> {
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: "PUT",
    // Uint8Array is a valid request body at runtime (verified against Walrus);
    // cast satisfies the stricter DOM BodyInit type under Next's typecheck.
    body: content as unknown as BodyInit,
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!res.ok) throw new Error(`Walrus upload failed: ${res.status} ${await res.text()}`);

  const json = await res.json();
  // Response is either { newlyCreated: {...} } or { alreadyCertified: {...} }
  const info = json.newlyCreated?.blobObject ?? json.alreadyCertified?.blobObject;
  if (!info) throw new Error(`Unexpected Walrus response: ${JSON.stringify(json)}`);

  return {
    blobId:          info.blobId,
    certifiedEpoch:  info.certifiedEpoch ?? info.storage?.startEpoch ?? 0,
    endEpoch:        info.storage?.endEpoch ?? 0,
  };
}

export async function fetchBlob(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
